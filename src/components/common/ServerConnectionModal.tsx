import React, { useState, useEffect } from 'react';
import { Server, RefreshCw, CheckCircle2, AlertTriangle, Save, X, ExternalLink, Database, Shield } from 'lucide-react';
import { Modal } from './Modal';
import { serverConfig, HealthCheckResult } from '../../config/serverConfig';

interface ServerConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerChanged?: (newUrl: string) => void;
}

export const ServerConnectionModal: React.FC<ServerConnectionModalProps> = ({
  isOpen,
  onClose,
  onServerChanged
}) => {
  const [serverUrl, setServerUrl] = useState<string>(serverConfig.getServerUrl());
  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const current = serverConfig.getServerUrl();
      setServerUrl(current);
      setHealth(null);
      setError(null);
      setSaveSuccess(false);
      // Automatically test current connection
      handleTest(current);
    }
  }, [isOpen]);

  const handleTest = async (urlToTest?: string) => {
    const target = urlToTest || serverUrl;
    setTesting(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const res = await serverConfig.testConnection(target);
      setHealth(res);
      if (!res.ok) {
        setError(res.error || 'تعذر الاتصال بالخادم');
      }
    } catch (err: any) {
      setError(err.message || 'فشل فحص الاتصال');
      setHealth({ ok: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const testRes = await serverConfig.testConnection(serverUrl);
      if (!testRes.ok) {
        setError(testRes.error || 'يرجى التأكد من عمل الخادم قبل الحفظ');
        setSaving(false);
        return;
      }

      await serverConfig.setServerUrl(serverUrl);
      setSaveSuccess(true);
      if (onServerChanged) {
        onServerChanged(serverUrl);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const isConnected = health?.ok === true;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تهيئة الاتصال بالخادم المركزي (Server Connection)"
      maxWidth="lg"
    >
      <div className="space-y-5 p-1">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            عنوان خادم الـ API المركزي (FastAPI Server URL)
          </label>
          <div className="relative">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.target.value);
                setHealth(null);
                setError(null);
                setSaveSuccess(false);
              }}
              placeholder="http://192.168.1.100:8000"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              dir="ltr"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            أدخل عنوان الـ IP أو النطاق لخادم التطبيق المركزي (مثال: <code className="text-slate-300 font-mono">http://localhost:8000</code> أو <code className="text-slate-300 font-mono">http://192.168.1.100:8000</code>)
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleTest()}
            disabled={testing || !serverUrl.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 text-xs sm:text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'جارٍ الفحص...' : 'فحص الاتصال (Test Connection)'}</span>
          </button>
        </div>

        {/* Status Box */}
        {health && (
          <div className={`p-4 rounded-xl border text-xs sm:text-sm transition-all ${
            isConnected
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
              : 'bg-red-950/30 border-red-800/60 text-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2 font-semibold">
              {isConnected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">الخادم متصل بنجاح (Connected)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-red-300">تعذر الاتصال بالخادم</span>
                </>
              )}
            </div>

            {isConnected ? (
              <div className="space-y-1 text-xs pt-2 border-t border-emerald-800/40">
                <div className="flex justify-between">
                  <span className="text-slate-400">حالة الخادم (API Status):</span>
                  <span className="font-semibold text-emerald-300">{health.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">قاعدة البيانات (Database Status):</span>
                  <span className="font-semibold text-emerald-300">{health.database || 'connected'}</span>
                </div>
                {health.version && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">إصدار النظام (Version):</span>
                    <span className="text-slate-300 font-mono">{health.version}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-red-300 pt-1">
                {error || health.error || 'تعذر الوصول إلى الخادم. تأكد من العنوان وجدار الحماية.'}
              </p>
            )}
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>تم حفظ عنوان الخادم الجديد وتحديث الاتصال بنجاح.</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
          >
            إلغاء (Cancel)
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || testing || (health !== null && !health.ok)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-md shadow-blue-600/20 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ الخادم (Save)'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
