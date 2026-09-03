// Centralized Runtime Server URL Configuration

export interface HealthCheckResult {
  ok: boolean;
  statusCode?: number;
  status?: string;
  database?: string;
  version?: string;
  service?: string;
  error?: string;
  time?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron?: boolean;
      getServerUrl: () => Promise<string>;
      setServerUrl: (url: string) => Promise<{ success: boolean; serverUrl?: string; error?: string }>;
      testServerUrl: (url: string) => Promise<HealthCheckResult>;
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      onServerUrlChanged: (callback: (url: string) => void) => () => void;
    };
  }
}

const STORAGE_KEY = 'vending_fleet_server_url';
const DEFAULT_URL = 'http://localhost:8000';

class ServerConfigService {
  private currentUrl: string = DEFAULT_URL;
  private isElectron: boolean = false;
  private listeners: Array<(url: string) => void> = [];
  private isInitialized: boolean = false;
  private initPromise: Promise<string> | null = null;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
    this.currentUrl = this.getInitialUrl();

    if (typeof window !== 'undefined') {
      if (this.isElectron && window.electronAPI?.onServerUrlChanged) {
        window.electronAPI.onServerUrlChanged((newUrl: string) => {
          if (newUrl && newUrl !== this.currentUrl) {
            this.currentUrl = this.normalizeUrl(newUrl);
            this.notifyListeners();
          }
        });
      }
    }
  }

  private normalizeUrl(url: string): string {
    if (!url) return DEFAULT_URL;
    let clean = url.trim();
    clean = clean.replace(/\/+$/, '');
    return clean;
  }

  private getInitialUrl(): string {
    if (typeof window === 'undefined') return DEFAULT_URL;

    // Check localStorage first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored.trim().length > 0) {
        return this.normalizeUrl(stored);
      }
    } catch {
      // Storage unavailable
    }

    // In web mode, if running in browser with valid origin (not file://), use current origin as default
    if (!this.isElectron && window.location && window.location.origin && window.location.origin !== 'null' && !window.location.protocol.startsWith('file')) {
      return this.normalizeUrl(window.location.origin);
    }

    return DEFAULT_URL;
  }

  public async initialize(): Promise<string> {
    if (this.isInitialized) return this.currentUrl;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (this.isElectron && window.electronAPI?.getServerUrl) {
        try {
          const electronUrl = await window.electronAPI.getServerUrl();
          if (electronUrl && typeof electronUrl === 'string' && electronUrl.trim().length > 0) {
            this.currentUrl = this.normalizeUrl(electronUrl);
            try {
              localStorage.setItem(STORAGE_KEY, this.currentUrl);
            } catch {}
          }
        } catch (err) {
          console.warn('[ServerConfig] Could not read URL from Electron IPC:', err);
        }
      }
      this.isInitialized = true;
      return this.currentUrl;
    })();

    return this.initPromise;
  }

  public getServerUrl(): string {
    return this.currentUrl;
  }

  public getApiBaseUrl(): string {
    return `${this.currentUrl}/api/v1`;
  }

  public getIsElectron(): boolean {
    return this.isElectron;
  }

  public async setServerUrl(newUrl: string): Promise<{ success: boolean; error?: string }> {
    const cleanUrl = this.normalizeUrl(newUrl);
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return { success: false, error: 'يجب أن يبدأ عنوان الخادم بـ http:// أو https://' };
    }

    this.currentUrl = cleanUrl;

    // Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, cleanUrl);
    } catch (err) {
      console.warn('[ServerConfig] Could not save to localStorage:', err);
    }

    // Persist to Electron config if in desktop app
    if (this.isElectron && window.electronAPI?.setServerUrl) {
      try {
        const res = await window.electronAPI.setServerUrl(cleanUrl);
        if (!res.success) {
          console.warn('[ServerConfig] Electron setServerUrl warning:', res.error);
        }
      } catch (err: any) {
        console.warn('[ServerConfig] Electron IPC setServerUrl error:', err);
      }
    }

    this.notifyListeners();
    return { success: true };
  }

  public async testConnection(targetUrl?: string): Promise<HealthCheckResult> {
    const urlToTest = this.normalizeUrl(targetUrl || this.currentUrl);

    // If running in Electron, use Node-level test via IPC to bypass any renderer CORS constraints
    if (this.isElectron && window.electronAPI?.testServerUrl) {
      try {
        return await window.electronAPI.testServerUrl(urlToTest);
      } catch (err: any) {
        return { ok: false, error: err.message || 'IPC health check failed' };
      }
    }

    // In web/browser mode, test via fetch
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // Try /health first, fallback to /api/v1/health
      let response: Response | null = null;
      let usedEndpoint = `${urlToTest}/health`;
      try {
        response = await fetch(usedEndpoint, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
      } catch {
        usedEndpoint = `${urlToTest}/api/v1/health`;
        response = await fetch(usedEndpoint, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (response && response.ok) {
        const data = await response.json();
        return {
          ok: true,
          statusCode: response.status,
          status: data.status || 'ok',
          database: data.database || 'connected',
          version: data.version || '1.0.0',
          service: data.service || 'Vending Management System',
          time: data.time || new Date().toISOString()
        };
      } else {
        return {
          ok: false,
          statusCode: response?.status,
          error: `استجاب الخادم برمز خطأ HTTP ${response?.status || 'Unknown'}`
        };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { ok: false, error: 'انتهت مهلة الاتصال بالخادم (6 ثوانٍ). يرجى التأكد من تشغيل الخادم والشبكة.' };
      }
      return { ok: false, error: err.message || 'تعذر الاتصال بالخادم' };
    }
  }

  public subscribe(listener: (url: string) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentUrl);
      } catch (err) {
        console.error('[ServerConfig] Error in subscriber:', err);
      }
    }
  }
}

export const serverConfig = new ServerConfigService();
