import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { NavigationTab } from './types';

// Views
import { LoginView } from './components/views/LoginView';
import { DashboardView } from './components/views/DashboardView';
import { MachinesView } from './components/views/MachinesView';
import { MachineDetailView } from './components/views/MachineDetailView';
import { BuildingsView } from './components/views/BuildingsView';
import { LocationsView } from './components/views/LocationsView';
import { TicketsView } from './components/views/TicketsView';
import { TicketDetailView } from './components/views/TicketDetailView';
import { TechniciansView } from './components/views/TechniciansView';
import { TechnicianDetailView } from './components/views/TechnicianDetailView';
import { MaintenanceView } from './components/views/MaintenanceView';
import { SparePartsView } from './components/views/SparePartsView';
import { InventoryView } from './components/views/InventoryView';
import { PartRequestsView } from './components/views/PartRequestsView';
import { SuppliersView } from './components/views/SuppliersView';
import { ReportsView } from './components/views/ReportsView';
import { ImportExportView } from './components/views/ImportExportView';
import { ImportHistoryView } from './components/views/ImportHistoryView';
import { UsersView } from './components/views/UsersView';
import { SettingsView } from './components/views/SettingsView';
import { AuditLogsView } from './components/views/AuditLogsView';
import { PublicTicketPortal } from './components/views/PublicTicketPortal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AccessDeniedView } from './components/common/AccessDeniedView';
import { ServerConnectionScreen } from './components/common/ServerConnectionScreen';
import { serverConfig } from './config/serverConfig';

const getInitialRoute = (): { tab: NavigationTab; id?: string } => {
  if (typeof window !== 'undefined') {
    try {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      let machineParam = params.get('machineId') || params.get('machine') || params.get('qr') || params.get('id');
      const pathname = window.location.pathname;
      const hash = window.location.hash;

      if (!machineParam && hash.includes('?')) {
        const hashParams = new URLSearchParams(hash.split('?')[1] || '');
        machineParam = hashParams.get('machineId') || hashParams.get('machine') || hashParams.get('qr') || hashParams.get('id');
      }

      if (pathname.includes('report-fault') || pathname.includes('public-portal') || hash.includes('public-portal') || hash.includes('report-fault') || machineParam) {
        return {
          tab: 'public-portal',
          id: machineParam ? decodeURIComponent(machineParam).trim() : undefined
        };
      }
    } catch {
      // Fallback
    }
  }
  return { tab: 'dashboard', id: undefined };
};

const AppContent: React.FC = () => {
  const { isAuthenticated, user, canAccessTab } = useAuth();
  const initialRoute = useRef(getInitialRoute()).current;
  const [activeTab, setActiveTab] = useState<NavigationTab>(initialRoute.tab);
  const [activeDetailId, setActiveDetailId] = useState<string | undefined>(initialRoute.id);
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await serverConfig.initialize();
        const res = await serverConfig.testConnection();
        if (!isMounted) return;
        if (res.ok) {
          setServerStatus('connected');
        } else {
          setServerStatus('disconnected');
          setConnectionError(res.error || 'تعذر الاتصال بالخادم المركزي');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setServerStatus('disconnected');
        setConnectionError(err.message || 'فشل فحص الاتصال بالخادم');
      }
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const route = getInitialRoute();
    if (route.tab === 'public-portal') {
      setActiveTab('public-portal');
      if (route.id) setActiveDetailId(route.id);
    }
  }, []);

  const handleNavigate = (tab: NavigationTab, id?: string) => {
    setActiveTab(tab);
    setActiveDetailId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If server cannot be reached, show Connection Failure screen per Section 15
  if (serverStatus === 'disconnected') {
    return (
      <ServerConnectionScreen
        initialMode="failure"
        errorMessage={connectionError || undefined}
        onConnected={() => {
          setServerStatus('connected');
          setConnectionError(null);
        }}
      />
    );
  }

  // Initial connection verification state
  if (serverStatus === 'checking') {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">جارٍ الاتصال بالخادم المركزي...</p>
        <p className="text-xs text-slate-500 mt-1">Connecting to backend server...</p>
      </div>
    );
  }

  // If public reporting portal is explicitly accessed
  if (activeTab === 'public-portal') {
    return (
      <ErrorBoundary fallbackTitle="Portal Error" onReset={() => handleNavigate('dashboard')}>
        <PublicTicketPortal initialMachineNumber={activeDetailId} onNavigate={handleNavigate} />
      </ErrorBoundary>
    );
  }

  // If not authenticated, render Login Screen
  if (!isAuthenticated) {
    return <LoginView onNavigate={handleNavigate} />;
  }

  const isTabAllowed = canAccessTab(activeTab);

  // Render within Enterprise Layout Shell
  return (
    <Layout
      activeTab={activeTab}
      onNavigate={handleNavigate}
    >
      <ErrorBoundary fallbackTitle="View Error" onReset={() => handleNavigate('dashboard')}>
        {!isTabAllowed ? (
          <AccessDeniedView requestedTab={activeTab} onNavigate={handleNavigate} />
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
            {activeTab === 'machines' && <MachinesView onNavigate={handleNavigate} />}
            {activeTab === 'machine-detail' && (
              <MachineDetailView machineId={activeDetailId || ''} onNavigate={handleNavigate} />
            )}
            {activeTab === 'buildings' && <BuildingsView onNavigate={handleNavigate} />}
            {activeTab === 'locations' && <LocationsView onNavigate={handleNavigate} />}
            {activeTab === 'tickets' && <TicketsView onNavigate={handleNavigate} initialAction={activeDetailId} />}
            {activeTab === 'ticket-detail' && (
              <TicketDetailView ticketId={activeDetailId || ''} onNavigate={handleNavigate} />
            )}
            {activeTab === 'technicians' && <TechniciansView onNavigate={handleNavigate} />}
            {activeTab === 'technician-detail' && (
              <TechnicianDetailView technicianId={activeDetailId || ''} onNavigate={handleNavigate} />
            )}
            {activeTab === 'maintenance' && <MaintenanceView onNavigate={handleNavigate} />}
            {activeTab === 'spare-parts' && <SparePartsView onNavigate={handleNavigate} />}
            {activeTab === 'inventory' && <InventoryView onNavigate={handleNavigate} />}
            {activeTab === 'part-requests' && <PartRequestsView onNavigate={handleNavigate} />}
            {activeTab === 'suppliers' && <SuppliersView onNavigate={handleNavigate} />}
            {activeTab === 'reports' && <ReportsView onNavigate={handleNavigate} />}
            {activeTab === 'import-export' && <ImportExportView onNavigate={handleNavigate} />}
            {activeTab === 'import-history' && <ImportHistoryView onNavigate={handleNavigate} />}
            {activeTab === 'users' && <UsersView onNavigate={handleNavigate} />}
            {activeTab === 'settings' && <SettingsView />}
            {activeTab === 'audit-logs' && <AuditLogsView onNavigate={handleNavigate} />}
          </>
        )}
      </ErrorBoundary>
    </Layout>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
