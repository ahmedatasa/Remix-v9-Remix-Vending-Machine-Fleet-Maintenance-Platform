import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Database,
  Server,
  Bell,
  Clock,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Phone,
  Mail,
  Headphones,
  Save,
  MessageSquare,
  Download,
  Upload,
  RefreshCw,
  HardDriveDownload,
  FileCheck,
  AlertTriangle,
  Trash2,
  Lock,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ServerConnectionModal } from '../common/ServerConnectionModal';
import { serverConfig } from '../../config/serverConfig';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const SettingsView: React.FC = () => {
  const { t, language } = useLanguage();
  const { showToast } = useNotification();
  const { user, isAdmin, canCommitBaseline, canPurgeDatabase, canManageSettings } = useAuth();
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const [criticalSla, setCriticalSla] = useState(2);
  const [highSla, setHighSla] = useState(4);
  const [mediumSla, setMediumSla] = useState(8);
  const [lowSla, setLowSla] = useState(24);

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isRestoringBaseline, setIsRestoringBaseline] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Baseline Commitment & Purge Workflow State
  const [baselineStatus, setBaselineStatus] = useState<{
    isCommitted: boolean;
    committedAt: string | null;
    committedBy: string | null;
    notes: string | null;
    hasCommittedBaselineOnDisk: boolean;
    stats?: {
      machines: number;
      buildings: number;
      locations: number;
      technicians: number;
      spareParts: number;
      tickets: number;
    };
  } | null>(null);

  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [adminName, setAdminName] = useState('مدير النظام');
  const [commitNotes, setCommitNotes] = useState('البيانات الحقيقية المعتمدة لأسطول أجهزة البيع الذاتي للشركة');
  const [adminAgreement, setAdminAgreement] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeDeleteCommitted, setPurgeDeleteCommitted] = useState(false);

  const [dbStats, setDbStats] = useState<{
    totalMachines: number;
    totalBuildings: number;
    totalLocations: number;
    totalTickets: number;
    totalSpareParts: number;
    totalTechnicians: number;
  }>({
    totalMachines: 0,
    totalBuildings: 0,
    totalLocations: 0,
    totalTickets: 0,
    totalSpareParts: 0,
    totalTechnicians: 0
  });

  // Customer Support & Hotline Settings
  const [supportPhone, setSupportPhone] = useState('800-123-4567');
  const [supportEmail, setSupportEmail] = useState('support@vendingfleet.com');
  const [supportHoursAr, setSupportHoursAr] = useState('خدمة العملاء على مدار 24 ساعة طوال أيام الأسبوع');
  const [supportWhatsapp, setSupportWhatsapp] = useState('+966-50-000-0000');
  const [isSavingSupport, setIsSavingSupport] = useState(false);

  // Server Connection Configuration State per Desktop Specification
  const [currentServerUrl, setCurrentServerUrl] = useState<string>(serverConfig.getServerUrl());
  const [isServerModalOpen, setIsServerModalOpen] = useState<boolean>(false);
  const [apiConnectionStatus, setApiConnectionStatus] = useState<'Connected' | 'Disconnected' | 'Checking'>('Checking');
  const [dbConnectionStatus, setDbConnectionStatus] = useState<'Connected' | 'Disconnected' | 'Checking'>('Checking');
  const [isTestingServer, setIsTestingServer] = useState<boolean>(false);

  const checkServerStatus = async (urlToCheck?: string) => {
    setIsTestingServer(true);
    try {
      const res = await serverConfig.testConnection(urlToCheck || currentServerUrl);
      if (res.ok) {
        setApiConnectionStatus('Connected');
        setDbConnectionStatus(res.database ? 'Connected' : 'Connected');
      } else {
        setApiConnectionStatus('Disconnected');
        setDbConnectionStatus('Disconnected');
      }
    } catch {
      setApiConnectionStatus('Disconnected');
      setDbConnectionStatus('Disconnected');
    } finally {
      setIsTestingServer(false);
    }
  };

  const loadStats = () => {
    api.getDatabaseInfo().then(info => {
      setDbStats({
        totalMachines: info.totalMachines,
        totalBuildings: info.totalBuildings,
        totalLocations: info.totalLocations,
        totalTickets: info.totalTickets,
        totalSpareParts: info.totalSpareParts,
        totalTechnicians: info.totalTechnicians
      });
    }).catch(() => {});
  };

  const loadBaselineStatus = () => {
    api.getBaselineStatus().then(status => {
      if (status) setBaselineStatus(status);
    }).catch(() => {});
  };

  // Load existing settings
  useEffect(() => {
    loadStats();
    loadBaselineStatus();
    checkServerStatus();

    const unsubscribeServer = serverConfig.subscribe((newUrl) => {
      setCurrentServerUrl(newUrl);
      checkServerStatus(newUrl);
    });

    const handleUpdate = () => {
      loadStats();
      loadBaselineStatus();
    };
    window.addEventListener('vending-fleet-data-updated', handleUpdate);

    api.getSettings().then(s => {
      if (s) {
        if (s.criticalSla !== undefined) setCriticalSla(s.criticalSla);
        if (s.highSla !== undefined) setHighSla(s.highSla);
        if (s.mediumSla !== undefined) setMediumSla(s.mediumSla);
        if (s.lowSla !== undefined) setLowSla(s.lowSla);
        if (s.emailAlerts !== undefined) setEmailAlerts(s.emailAlerts);
        if (s.smsAlerts !== undefined) setSmsAlerts(s.smsAlerts);
        if (s.supportPhone) setSupportPhone(s.supportPhone);
        if (s.supportEmail) setSupportEmail(s.supportEmail);
        if (s.supportHoursAr) setSupportHoursAr(s.supportHoursAr);
        if (s.supportWhatsapp) setSupportWhatsapp(s.supportWhatsapp);
      }
    }).catch(() => {});

    return () => {
      unsubscribeServer();
      window.removeEventListener('vending-fleet-data-updated', handleUpdate);
    };
  }, []);

  const handleSaveSla = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        criticalSla,
        highSla,
        mediumSla,
        lowSla,
        emailAlerts,
        smsAlerts,
        supportPhone,
        supportEmail,
        supportHoursAr,
        supportWhatsapp
      });
      showToast(t('success'), 'تم حفظ وتحديث أوقات الاستجابة (SLA) في محرك البلاغات بنجاح!', 'success');
    } catch {
      showToast(t('error'), 'فشل حفظ الإعدادات', 'error');
    }
  };

  const handleSaveSupportConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSupport(true);
    try {
      await api.updateSettings({
        criticalSla,
        highSla,
        mediumSla,
        lowSla,
        emailAlerts,
        smsAlerts,
        supportPhone,
        supportEmail,
        supportHoursAr,
        supportWhatsapp
      });
      showToast(t('success'), 'تم حفظ رقم هاتف الاستفسار والمتابعة وبيانات الدعم الفني بنجاح، وتم تحديثها فوراً في بوابة البلاغات العامة!', 'success');
    } catch {
      showToast(t('error'), 'تعذر حفظ بيانات الدعم الفني', 'error');
    } finally {
      setIsSavingSupport(false);
    }
  };

  // Commit Real Data as Authoritative Master Baseline (Admin Confirmation)
  const handleCommitBaseline = async () => {
    if (!adminAgreement) {
      showToast(t('error'), 'يرجى الإقرار والموافقة بصفتك مدير النظام على اعتماد هذه البيانات', 'error');
      return;
    }

    setIsCommitting(true);
    try {
      await api.commitMasterBaseline({
        confirmedBy: adminName.trim() || 'مدير النظام',
        notes: commitNotes.trim()
      });
      showToast(t('success'), 'تم اعتماد وحفظ البيانات الحقيقية الحالية بنجاح كنسخة أساسية دائمة للنظام!', 'success');
      setIsCommitModalOpen(false);
      loadStats();
      loadBaselineStatus();
    } catch (err: any) {
      showToast(t('error'), err?.message || 'تعذر اعتماد النسخة الأساسية', 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  // Restore Master Baseline
  const handleRestoreBaseline = async () => {
    if (!window.confirm('هل أنت متأكد من استعادة النسخة الأساسية المعتمدة؟ سيتم تحميل البيانات التي تم اعتمادها وحفظها بواسطة مدير النظام.')) return;

    setIsRestoringBaseline(true);
    try {
      const res = await api.restoreCommittedBaseline();
      loadStats();
      loadBaselineStatus();
      showToast(t('success'), `تمت استعادة البيانات الأساسية المعتمدة بنجاح! (${res.machinesCount ?? dbStats.totalMachines} ماكينة معتمدة).`, 'success');
    } catch (err: any) {
      showToast(t('error'), err?.message || 'فشلت استعادة قاعدة البيانات الأساسية', 'error');
    } finally {
      setIsRestoringBaseline(false);
    }
  };

  // Purge/Clean Data
  const handlePurgeAll = async () => {
    setIsPurging(true);
    try {
      await api.purgeDatabase({ deleteCommittedBaseline: purgeDeleteCommitted });
      showToast(t('success'), 'تم تفريغ كافة البيانات بنجاح، قاعدة البيانات جاهزة الآن لاستقبال البيانات الحقيقية.', 'success');
      setIsPurgeModalOpen(false);
      loadStats();
      loadBaselineStatus();
    } catch (err: any) {
      showToast(t('error'), err?.message || 'تعذر تفريغ البيانات', 'error');
    } finally {
      setIsPurging(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await api.exportFullBackup();
      showToast(t('success'), 'تم إنشاء وتنزيل ملف النسخة الاحتياطية الكاملة للنظام بنجاح!', 'success');
    } catch (err: any) {
      showToast(t('error'), 'تعذر تصدير النسخة الاحتياطية', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const result = await api.restoreFullBackup(parsed);
        loadStats();
        loadBaselineStatus();
        showToast(t('success'), `تمت استعادة النسخة الاحتياطية من الملف بنجاح! (${result.machinesCount} ماكينة)`, 'success');
      } catch (err: any) {
        showToast(t('error'), err?.message || 'فشلت قراءة أو استعادة ملف النسخة الاحتياطية', 'error');
      } finally {
        setIsImporting(false);
        if (backupFileInputRef.current) backupFileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      showToast(t('error'), 'تعذر قراءة ملف النسخة الاحتياطية', 'error');
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await api.resetDatabase();
      loadStats();
      loadBaselineStatus();
      showToast(t('success'), 'تمت إعادة ضبط قاعدة البيانات بنجاح!', 'success');
    } catch {
      showToast(t('error'), 'فشلت إعادة ضبط قاعدة البيانات', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">{t('settings')} & Platform Engine</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          إعدادات النظام، هاتف الاستفسار والمتابعة لبوابة العملاء، سياسات الاستجابة SLA ومراقبة البنية التحتية
        </p>
      </div>

      {/* Server Connection Section per Desktop Specification (Section 13) */}
      <Card
        title="الاتصال بالخادم المركزي (Server Connection)"
        subtitle="Centralized Backend Server & Database Connectivity Configuration"
      >
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Server */}
            <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                عنوان الخادم الحالي (Current Server):
              </span>
              <span className="font-mono text-xs font-semibold text-blue-400 break-all select-all block">
                {currentServerUrl}
              </span>
            </div>

            {/* API Status */}
            <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                حالة واجهة الـ API (API Status):
              </span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${apiConnectionStatus === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-xs font-bold ${apiConnectionStatus === 'Connected' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {apiConnectionStatus}
                </span>
              </div>
            </div>

            {/* Database Status */}
            <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                حالة قاعدة البيانات (Database Status):
              </span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dbConnectionStatus === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-xs font-bold ${dbConnectionStatus === 'Connected' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {dbConnectionStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="text-xs text-slate-400">
              يمكنك تعديل عنوان الخادم في أي وقت دون الحاجة لإعادة تثبيت التطبيق.
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => checkServerStatus()}
                disabled={isTestingServer}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingServer ? 'animate-spin' : ''}`} />
                <span>{isTestingServer ? 'جارٍ الفحص...' : 'فحص الاتصال (Test Connection)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsServerModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
              >
                <Server className="w-3.5 h-3.5" />
                <span>تغيير الخادم (Change Server)</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await serverConfig.setServerUrl(currentServerUrl);
                  showToast(t('success'), 'تم حفظ إعدادات الخادم بنجاح!', 'success');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ (Save)</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: System Status */}
        <div className="space-y-6">
          <Card title="Infrastructure Health" subtitle="Container runtime diagnostics">
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="font-semibold text-slate-200 block">Fleet Data Server Engine</span>
                    <span className="text-[10px] text-slate-400 font-mono">Port 3000 • Unified Real-time Sync</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono">
                  ONLINE
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="font-semibold text-slate-200 block">QR Public Ingestion API</span>
                    <span className="text-[10px] text-slate-400 font-mono">REST Full-Stack Worker</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono">
                  HEALTHY
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold text-slate-200 block">Excel Normalization Service</span>
                    <span className="text-[10px] text-slate-400 font-mono">SheetJS XLSX Pipeline</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono">
                  READY
                </span>
              </div>
            </div>
          </Card>

          {/* Database Master Baseline & Backup Card */}
          <Card
            title="إدارة واعتماد البيانات الأساسية الدائمة (Master Baseline)"
            subtitle="Authoritative Master Baseline & Database Persistence"
          >
            <div className="space-y-4">
              {/* Database Live Status & Baseline Badge */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-blue-400" />
                    <span>حالة النسخة الأساسية:</span>
                  </span>
                  {baselineStatus?.isCommitted ? (
                    <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>معتمدة ومحفوظة للنظام</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>قاعدة بيانات أولية جاهزة للإدخال</span>
                    </span>
                  )}
                </div>

                {baselineStatus?.isCommitted && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 space-y-1">
                    <div className="flex justify-between items-center font-medium">
                      <span>المسؤول المعتمد:</span>
                      <strong className="text-white">{baselineStatus.committedBy || 'مدير النظام'}</strong>
                    </div>
                    {baselineStatus.committedAt && (
                      <div className="flex justify-between items-center text-[10px] text-emerald-400/80">
                        <span>تاريخ الاعتماد:</span>
                        <span dir="ltr">{new Date(baselineStatus.committedAt).toLocaleString('ar-SA')}</span>
                      </div>
                    )}
                    {baselineStatus.notes && (
                      <p className="text-[10px] text-slate-400 pt-1 border-t border-emerald-800/30">
                        {baselineStatus.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Database Record Live Counts */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/80">
                  <div className="bg-slate-900/80 p-2 rounded-lg">
                    <span className="block text-sm font-bold text-slate-100 font-mono">{dbStats.totalMachines}</span>
                    <span className="text-[10px] text-slate-400">ماكينة مسجلة</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg">
                    <span className="block text-sm font-bold text-slate-100 font-mono">{dbStats.totalBuildings}</span>
                    <span className="text-[10px] text-slate-400">مبنى وموقع</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg">
                    <span className="block text-sm font-bold text-slate-100 font-mono">{dbStats.totalSpareParts}</span>
                    <span className="text-[10px] text-slate-400">قطع غيار</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                يمكنك بعد الانتهاء من إدخال أو استيراد البيانات الحقيقية للشركة اعتمادها وتثبيتها كنسخة أساسية دائمة بضغطة زر وتأكيد مدير النظام.
              </p>

              {/* Action 1: Commit Master Baseline with Admin Confirmation (Super Admin Only) */}
              {canCommitBaseline && (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  icon={ShieldCheck}
                  onClick={() => {
                    setAdminAgreement(false);
                    setIsCommitModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 shadow-lg shadow-emerald-950/50"
                >
                  اعتماد وحفظ البيانات الحقيقية (تأكيد مدير النظام)
                </Button>
              )}

              {/* Action 2: Restore Master Baseline */}
              {isAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon={RefreshCw}
                  isLoading={isRestoringBaseline}
                  disabled={!baselineStatus?.hasCommittedBaselineOnDisk}
                  onClick={handleRestoreBaseline}
                  className="border border-slate-700 hover:border-slate-600 text-slate-200"
                >
                  استعادة النسخة الأساسية المعتمدة
                </Button>
              )}

              {/* Action 3: Purge & Clean Slate (Super Admin Only) */}
              {canPurgeDatabase && (
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  icon={Trash2}
                  onClick={() => {
                    setPurgeDeleteCommitted(false);
                    setIsPurgeModalOpen(true);
                  }}
                  className="border border-rose-900/50 hover:bg-rose-950/40 text-rose-400 text-xs"
                >
                  تفريغ وتنظيف قاعدة البيانات (بدء صفحة نظيفة)
                </Button>
              )}

              {/* Action 4 & 5: Backup Export and File Import */}
              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  isLoading={isExporting}
                  onClick={handleExportBackup}
                  className="text-[11px] py-1.5 text-slate-300"
                >
                  تصدير ملف (JSON)
                </Button>

                <div>
                  <input
                    type="file"
                    ref={backupFileInputRef}
                    accept=".json"
                    onChange={handleImportBackupFile}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={Upload}
                    isLoading={isImporting}
                    onClick={() => backupFileInputRef.current?.click()}
                    className="text-[11px] py-1.5 text-slate-300"
                  >
                    استيراد ملف (JSON)
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 2 Columns: Support Phone & SLA Policies */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Customer Support & QR Portal Helpline Configuration */}
          <Card 
            title="إعدادات خدمة العملاء ورقم الاستفسار والمتابعة (QR Portal Support)" 
            subtitle="الرقم والبيانات التي تظهر للعملاء عند مسح كود الـ QR وفي شاشة تأكيد البلاغ واسترجاع المبالغ"
          >
            <form onSubmit={handleSaveSupportConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-blue-400 block mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>رقم الهاتف المخصص للاستفسار والمتابعة (Hotline)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supportPhone}
                    onChange={e => setSupportPhone(e.target.value)}
                    placeholder="مثال: 800-123-4567 أو 920001234"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    يظهر مباشرة في أسفل شاشة تسجيل البلاغ وشاشة التأكيد للعميل.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>البريد الإلكتروني لخدمة العملاء</span>
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={e => setSupportEmail(e.target.value)}
                    placeholder="support@vendingfleet.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    يُستخدم لمراسلات الدعم الفني واسترجاع العمليات البنكية.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>أوقات العمل المعتمدة</span>
                  </label>
                  <input
                    type="text"
                    value={supportHoursAr}
                    onChange={e => setSupportHoursAr(e.target.value)}
                    placeholder="خدمة العملاء على مدار 24 ساعة طوال أيام الأسبوع"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-emerald-400 block mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>رقم الواتساب للاستفسارات السريعة (اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={supportWhatsapp}
                    onChange={e => setSupportWhatsapp(e.target.value)}
                    placeholder="+966-50-000-0000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800/80">
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="sm"
                  icon={Save}
                  isLoading={isSavingSupport}
                >
                  حفظ وتحديث بيانات هاتف الدعم الفني
                </Button>
              </div>
            </form>
          </Card>

          {/* SLA Thresholds Form */}
          <Card title="Maintenance SLA Targets" subtitle="أقصى وقت مسموح به لحل البلاغ حسب درجة الخطورة">
            <form onSubmit={handleSaveSla} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-rose-400 block mb-1">
                    حرج (Critical)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={criticalSla}
                      onChange={e => setCriticalSla(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">ساعات</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-amber-400 block mb-1">
                    مرتفع (High)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={highSla}
                      onChange={e => setHighSla(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">ساعات</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-blue-400 block mb-1">
                    متوسط (Medium)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={mediumSla}
                      onChange={e => setMediumSla(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">ساعات</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    منخفض (Low)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={lowSla}
                      onChange={e => setLowSla(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">ساعات</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800/80">
                <Button type="submit" variant="outline" size="sm">
                  حفظ سياسة الـ SLA
                </Button>
              </div>
            </form>
          </Card>

          {/* Dispatch Alert Notifications */}
          <Card title="Automated Dispatch Notifications" subtitle="إشعارات التوجيه والتنبيهات المباشرة للفنيين والمشرفين">
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">إشعارات SMS للأعطال الحرجة (Critical SMS)</span>
                  <span className="text-[11px] text-slate-400">إرسال رسالة نصية فورية للفني المناوب عند تسجيل بلاغ عطل حرج (SLA ساعتين)</span>
                </div>
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={e => setSmsAlerts(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">ملخص نقص قطع الغيار بالمستودع</span>
                  <span className="text-[11px] text-slate-400">إشعار مدير المستودع تلقائياً عند هبوط كمية قطع الغيار عن حد الأمان</span>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={e => setEmailAlerts(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Admin Confirmation & Master Baseline Commitment                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCommitModalOpen}
        onClose={() => !isCommitting && setIsCommitModalOpen(false)}
        title="تأكيد مدير النظام - اعتماد وحفظ النسخة الأساسية الدائمة"
        subtitle="Authoritative Master Baseline Commitment"
        maxWidth="lg"
      >
        <div className="space-y-4 text-slate-200">
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>اعتماد البيانات الحقيقية كمرجع تشغيلي أساسي للنظام</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              عند التأكيد، سيقوم النظام بحفظ كافة السجلات الحقيقية المدخلة حالياً كـ (Authoritative Master Baseline). وسيتم استدعاؤها واعتمادها تلقائياً عند أي تشغيل للتطبيق أو عند نشره لأي جهة أو شركة أخرى.
            </p>
          </div>

          {/* Current Database Summary to be Committed */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-2 font-semibold">إحصائيات البيانات التي سيتم اعتمادها وحفظها:</span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="block text-base font-bold text-emerald-400 font-mono">{dbStats.totalMachines}</span>
                <span className="text-[10px] text-slate-400">ماكينة بيع ذاتي</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="block text-base font-bold text-blue-400 font-mono">{dbStats.totalBuildings}</span>
                <span className="text-[10px] text-slate-400">مبنى وموقع</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="block text-base font-bold text-purple-400 font-mono">{dbStats.totalSpareParts}</span>
                <span className="text-[10px] text-slate-400">قطعة غيار</span>
              </div>
            </div>
          </div>

          {/* Admin Name & Notes Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                اسم المسؤول المعتمد (مدير النظام) *
              </label>
              <input
                type="text"
                value={adminName}
                onChange={e => setAdminName(e.target.value)}
                placeholder="مثال: مدير العمليات / مدير الصيانة"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ملاحظات أو مسمى النسخة المعتمدة
              </label>
              <input
                type="text"
                value={commitNotes}
                onChange={e => setCommitNotes(e.target.value)}
                placeholder="مثال: النسخة الأساسية المعتمدة لأسطول 2026"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Explicit Confirmation Checkbox */}
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={adminAgreement}
                onChange={e => setAdminAgreement(e.target.checked)}
                className="mt-0.5 rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-xs text-slate-200 leading-relaxed">
                <strong>إقرار وموافقة مدير النظام:</strong> أقر بصفتي مدير النظام بأن هذه هي البيانات الحقيقية والنهائية المعتمدة، وأوافق على حفظها كنسخة أساسية دائمة للنظام (Master Baseline) تُسترجع في أي وقت وتُعتمد عند النشر.
              </span>
            </label>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCommitModalOpen(false)}
              disabled={isCommitting}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={ShieldCheck}
              isLoading={isCommitting}
              disabled={!adminAgreement || !adminName.trim() || isCommitting}
              onClick={handleCommitBaseline}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              تأكيد واعتماد النسخة الأساسية الآن
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: Database Purge / Clean Slate Confirmation                        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPurgeModalOpen}
        onClose={() => !isPurging && setIsPurgeModalOpen(false)}
        title="تفريغ وتنظيف قاعدة البيانات (بدء صفحة بيضاء)"
        subtitle="Purge Database & Initialize Clean Slate"
        maxWidth="md"
      >
        <div className="space-y-4 text-slate-200">
          <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>تنبيه: مسح البيانات لتجهيز النظام لاستقبال البيانات الحقيقية</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              سيتم تفريغ كافة سجلات الماكينات والمواقع وقطع الغيار والتذاكر التجريبية، وتهيئة قاعدة البيانات في حالة نظيفة (Clean Database) جاهزة للإدخال اليدوي أو استيراد ملفات الإكسيل المخصصة.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={purgeDeleteCommitted}
                onChange={e => setPurgeDeleteCommitted(e.target.checked)}
                className="mt-0.5 rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className="text-xs text-slate-300">
                حذف ملف النسخة الأساسية المعتمدة (Master Baseline) من الخادم أيضاً والبدء من الصفر تماماً.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPurgeModalOpen(false)}
              disabled={isPurging}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Trash2}
              isLoading={isPurging}
              onClick={handlePurgeAll}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              تأكيد تفريغ قاعدة البيانات الآن
            </Button>
          </div>
        </div>
      </Modal>

      {/* Server Connection Modal */}
      <ServerConnectionModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        onServerChanged={(newUrl) => {
          setCurrentServerUrl(newUrl);
          checkServerStatus(newUrl);
          showToast(t('success'), 'تم تحديث عنوان الخادم بنجاح', 'success');
        }}
      />
    </div>
  );
};
