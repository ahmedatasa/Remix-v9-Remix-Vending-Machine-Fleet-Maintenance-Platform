import React, { useState, useEffect } from 'react';
import { Server, Wifi, AlertTriangle, CheckCircle2, RefreshCw, Settings, ShieldCheck, Database, HardDrive } from 'lucide-react';
import { serverConfig, HealthCheckResult } from '../../config/serverConfig';

interface ServerConnectionScreenProps {
  onConnected?: () => void;
  initialMode?: 'setup' | 'failure';
  errorMessage?: string;
}

export const ServerConnectionScreen: React.FC<ServerConnectionScreenProps> = ({
  onConnected,
  initialMode = 'setup',
  errorMessage
}) => {
  const [serverUrl, setServerUrl] = useState<string>(serverConfig.getServerUrl());
  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [error, setError] = useState<string | null>(errorMessage || null);
  const [isEditing, setIsEditing] = useState<boolean>(initialMode === 'setup');

  useEffect(() => {
    // Run an initial health test on mount if in setup mode
    if (initialMode === 'setup') {
      handleTest(serverConfig.getServerUrl());
    }
  }, []);

  const handleTest = async (urlToTest?: string) => {
    const target = urlToTest || serverUrl;
    setTesting(true);
    setError(null);
    try {
      const result = await serverConfig.testConnection(target);
      setHealth(result);
      if (!result.ok) {
        setError(result.error || 'تعذر الوصول إلى الخادم');
      }
    } catch (err: any) {
      setError(err.message || 'فشل فحص الاتصال بالخادم');
      setHealth({ ok: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    setError(null);
    try {
      // First ensure connection is successful
      const testResult = await serverConfig.testConnection(serverUrl);
      if (!testResult.ok) {
        setError(testResult.error || 'تعذر الاتصال بعنوان الخادم المحدد. يرجى التحقق من الرابط ثم إعادة المحاولة.');
        setSaving(false);
        return;
      }

      await serverConfig.setServerUrl(serverUrl);
      if (onConnected) {
        onConnected();
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const isConnected = health?.ok === true;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* Header */}
        <div className="relative z-10 text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-4 shadow-inner">
            <Server className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Vending Management System
          </h1>
          <p className="text-sm text-slate-400">
            منصة إدارة وصيانة أجهزة البيع الذاتي • تهيئة الاتصال بالخادم المركزي
          </p>
        </div>

        {/* Failure view mode when not editing */}
        {!isEditing && initialMode === 'failure' && (
          <div className="relative z-10 space-y-6">
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-red-300">تعذر الاتصال بالخادم المركزي (Unable to connect to server)</h3>
                  <p className="text-xs text-red-200/80">
                    الخادم المستهدف: <code className="bg-red-900/40 px-1.5 py-0.5 rounded text-red-100 font-mono text-xs">{serverUrl}</code>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
              <p className="text-xs font-semibold text-slate-300">يرجى التحقق من الآتي (Please check):</p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>صحة عنوان الخادم ورقم المنفذ (Server URL & Port)</li>
                <li>اتصال الشبكة المحلية أو الإنترنت (Network connection)</li>
                <li>تشغيل خدمة الخادم المركزي (FastAPI / Server process running)</li>
                <li>إعدادات جدار الحماية والسماح للمنفذ (Firewall & Port permissions)</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleTest()}
                disabled={testing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                <span>إعادة المحاولة (Retry)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>تغيير الخادم (Change Server)</span>
              </button>
            </div>
          </div>
        )}

        {/* Editable Server Connection Form */}
        {(isEditing || initialMode === 'setup') && (
          <div className="relative z-10 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                عنوان الخادم المركزي (Server URL)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => {
                    setServerUrl(e.target.value);
                    setHealth(null);
                    setError(null);
                  }}
                  placeholder="http://192.168.1.100:8000"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl font-mono text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  dir="ltr"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400 flex items-center justify-between">
                <span>أمثلة: <code className="text-slate-300 font-mono">http://localhost:8000</code> أو <code className="text-slate-300 font-mono">http://192.168.1.100:8000</code></span>
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleTest()}
                disabled={testing || !serverUrl.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'جارٍ فحص الاتصال...' : 'فحص الاتصال بالخادم (Test Connection)'}</span>
              </button>
            </div>

            {/* Live Health Status Box */}
            {health && (
              <div className={`p-4 rounded-xl border transition-all ${
                isConnected
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                  : 'bg-red-950/30 border-red-800/60 text-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {isConnected ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="font-semibold text-emerald-300 text-sm">متصل بنجاح (Connected)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                      <span className="font-semibold text-red-300 text-sm">فشل الاتصال بالخادم</span>
                    </>
                  )}
                </div>

                {isConnected ? (
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-800/40 mt-2">
                    <div>
                      <span className="text-emerald-400/80">حالة واجهة الـ API: </span>
                      <span className="font-medium text-emerald-200">{health.status}</span>
                    </div>
                    <div>
                      <span className="text-emerald-400/80">قاعدة البيانات: </span>
                      <span className="font-medium text-emerald-200">{health.database || 'متصلة'}</span>
                    </div>
                    {health.version && (
                      <div>
                        <span className="text-emerald-400/80">الإصدار: </span>
                        <span className="font-medium text-emerald-200">{health.version}</span>
                      </div>
                    )}
                    {health.service && (
                      <div>
                        <span className="text-emerald-400/80">الخدمة: </span>
                        <span className="font-medium text-emerald-200 truncate">{health.service}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-red-300 pt-1">
                    {error || health.error || 'لم يستجب الخادم. تأكد من عنوان الـ IP والمنفذ وتشغيل الخادم.'}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saving || testing || (health !== null && !health.ok)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HardDrive className="w-4 h-4" />
                <span>{saving ? 'جارٍ الحفظ والاتصال...' : 'حفظ ومتابعة (Save & Continue)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="relative z-10 text-center mt-6 pt-4 border-t border-slate-800/60 text-xs text-slate-400">
          قاعدة بيانات مركزية موحدة • كافة محطات العمل تتصل بنفس الخادم الرئيسي
        </div>
      </div>
    </div>
  );
};
