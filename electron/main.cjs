const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

// Keep global reference of window object to avoid garbage collection
let mainWindow = null;

// Application configuration file path
function getConfigFilePath() {
  return path.join(app.getPath('userData'), 'vending_desktop_config.json');
}

// Load server URL configuration
function loadServerConfig() {
  try {
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.serverUrl === 'string' && parsed.serverUrl.trim().length > 0) {
        return parsed.serverUrl.trim().replace(/\/+$/, '');
      }
    }
  } catch (err) {
    console.warn('[Electron] Failed to read config file, falling back to default:', err);
  }
  return 'http://localhost:8000';
}

// Save server URL configuration
function saveServerConfig(serverUrl) {
  try {
    const cleanUrl = String(serverUrl || '').trim().replace(/\/+$/, '');
    const configPath = getConfigFilePath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ serverUrl: cleanUrl }, null, 2), 'utf8');
    return { success: true, serverUrl: cleanUrl };
  } catch (err) {
    console.error('[Electron] Failed to save config file:', err);
    return { success: false, error: err.message };
  }
}

// Perform HTTP/HTTPS health test with timeout
function testServerConnection(targetUrl) {
  return new Promise((resolve) => {
    try {
      const cleanUrl = String(targetUrl || '').trim().replace(/\/+$/, '');
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        return resolve({
          ok: false,
          error: 'رابط الخادم غير صالح. يجب أن يبدأ بـ http:// أو https:// (Invalid URL scheme)'
        });
      }

      const parsedUrl = new URL(`${cleanUrl}/health`);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.get(
        parsedUrl,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Vending-Management-Desktop/1.0.0'
          },
          timeout: 6000
        },
        (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                let data = {};
                try { data = JSON.parse(body); } catch { data = { raw: body }; }
                return resolve({
                  ok: true,
                  statusCode: res.statusCode,
                  status: data.status || 'ok',
                  database: data.database || 'connected',
                  version: data.version || '1.0.0',
                  service: data.service || 'Vending Management System'
                });
              } else {
                return resolve({
                  ok: false,
                  statusCode: res.statusCode,
                  error: `استجاب الخادم برمز خطأ HTTP ${res.statusCode}`
                });
              }
            } catch (err) {
              return resolve({ ok: false, error: 'فشل تحليل استجابة الخادم: ' + err.message });
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({
          ok: false,
          error: 'انتهت مهلة الاتصال بالخادم (Connection timed out after 6 seconds)'
        });
      });

      req.on('error', (err) => {
        resolve({
          ok: false,
          error: 'تعذر الاتصال بالخادم. يرجى التحقق من العنوان وجدار الحماية: ' + err.message
        });
      });
    } catch (err) {
      resolve({
        ok: false,
        error: 'رابط الخادم غير صالح: ' + err.message
      });
    }
  });
}

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    title: 'Vending Management System | منصة إدارة وصيانة أجهزة البيع الذاتي',
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    backgroundColor: '#020617', // Dark slate backdrop matching UI theme
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Remove default menu bar for clean enterprise appearance
  mainWindow.setMenuBarVisibility(false);

  // Smooth appearance once DOM is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load production bundle or development server
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-server-url', async () => {
  return loadServerConfig();
});

ipcMain.handle('set-server-url', async (event, url) => {
  const result = saveServerConfig(url);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('server-url-changed', result.serverUrl);
  }
  return result;
});

ipcMain.handle('test-server-url', async (event, url) => {
  return await testServerConnection(url);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
