/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { Header } from './components/common/Header';
import { AuthView } from './components/auth/AuthView';
import { PendingApprovalView } from './components/auth/PendingApprovalView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TechnicianDashboard } from './components/technician/TechnicianDashboard';
import { QuickScannerModal } from './components/common/QuickScannerModal';
import { BarcodeModal } from './components/common/BarcodeModal';
import { PermissionsPromptModal } from './components/common/PermissionsPromptModal';
import { NotificationDrawerModal } from './components/common/NotificationDrawerModal';
import { 
  subscribeToHerramientas, 
  subscribeToPrestamos, 
  subscribeToUsuarios,
  subscribeToSolicitudesRetiro,
  subscribeToTransferenciasCampo
} from './services/toolService';
import { 
  checkLocationPermission 
} from './services/geoService';
import { 
  checkNotificationPermission, 
  subscribeToMisNotificaciones 
} from './services/notificationService';
import { 
  Herramienta, 
  Prestamo, 
  Usuario, 
  SolicitudRetiro, 
  TransferenciaCampo,
  NotificacionSistema 
} from './types';
import { Wrench, ShieldAlert, LogOut, Loader2, ShieldCheck } from 'lucide-react';

const MainContent: React.FC = () => {
  const { 
    currentUser, 
    userProfile, 
    loading: authLoading, 
    isAdmin, 
    isTechnician, 
    isPending, 
    isRejected,
    logout 
  } = useAuth();
  
  const { showToast } = useToast();

  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'technician'>('admin');
  const [herramientas, setHerramientas] = useState<Herramienta[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudRetiro[]>([]);
  const [transferencias, setTransferencias] = useState<TransferenciaCampo[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionSistema[]>([]);
  
  const [isQuickScannerOpen, setIsQuickScannerOpen] = useState(false);
  const [scannedTool, setScannedTool] = useState<Herramienta | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Phone / PWA permission modals state
  const [isPermissionsPromptOpen, setIsPermissionsPromptOpen] = useState(false);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState(false);
  const [needsPermissions, setNeedsPermissions] = useState(false);

  // Toggle Dark Mode
  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  useEffect(() => {
    // Default is dark mode
    document.documentElement.classList.add('dark');
  }, []);

  // Listen to Firestore collections when authenticated
  useEffect(() => {
    if (!currentUser) return;

    const unsubTools = subscribeToHerramientas(
      (items) => setHerramientas(items),
      (err) => console.error('Error fetching herramientas:', err)
    );

    const unsubLoans = subscribeToPrestamos(
      (items) => setPrestamos(items),
      undefined,
      (err) => console.error('Error fetching prestamos:', err)
    );

    const unsubSolicitudes = subscribeToSolicitudesRetiro(
      (items) => setSolicitudes(items),
      undefined,
      (err) => console.error('Error fetching solicitudes:', err)
    );

    const unsubTransferencias = subscribeToTransferenciasCampo(
      (items) => setTransferencias(items),
      undefined,
      (err) => console.error('Error fetching transferencias:', err)
    );

    const unsubUsers = subscribeToUsuarios(
      (items) => setUsuarios(items),
      (err) => console.error('Error fetching usuarios:', err)
    );

    const unsubNotifs = subscribeToMisNotificaciones(
      currentUser.uid,
      isAdmin,
      (items) => setNotificaciones(items),
      (err) => console.error('Error fetching notificaciones:', err)
    );

    // Check phone/PWA permissions on mount
    const checkPermissions = async () => {
      const loc = await checkLocationPermission();
      const notif = checkNotificationPermission();
      const missing = loc !== 'granted' || notif !== 'granted';
      setNeedsPermissions(missing);

      const hasPrompted = sessionStorage.getItem('pwa_permissions_prompted');
      if (missing && !hasPrompted) {
        sessionStorage.setItem('pwa_permissions_prompted', 'true');
        setTimeout(() => setIsPermissionsPromptOpen(true), 900);
      }
    };
    checkPermissions();

    return () => {
      unsubTools();
      unsubLoans();
      unsubSolicitudes();
      unsubTransferencias();
      unsubUsers();
      unsubNotifs();
    };
  }, [currentUser, isAdmin]);

  const handleSelectScannedTool = (tool: Herramienta, action?: 'view' | 'loan' | 'return') => {
    setScannedTool(tool);
    setIsBarcodeModalOpen(true);
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/20 mb-4 animate-pulse">
          <Wrench className="w-8 h-8 text-black" />
        </div>
        <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Cargando sistema de control...</span>
        </div>
      </div>
    );
  }

  // Not Logged In -> Auth screen
  if (!currentUser) {
    return <AuthView />;
  }

  // Pending Approval View (Critical requirement from prompt)
  if (isPending) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <Header 
          onOpenScanner={() => {}} 
          isDarkMode={isDarkMode} 
          onToggleTheme={handleToggleTheme} 
        />
        <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6">
          <PendingApprovalView />
        </main>
      </div>
    );
  }

  // Rejected View
  if (isRejected) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-rose-900/50 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Acceso Denegado</h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Tu cuenta ha sido rechazada o suspendida por un administrador del sistema. Contacta con el departamento de herramientas o soporte interno si crees que se trata de un error.
          </p>
          <button
            onClick={logout}
            className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Approved User (Admin or Technician)
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-100 text-zinc-900'} transition-colors flex flex-col`}>
      <Header
        onOpenScanner={() => setIsQuickScannerOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        unreadNotificationsCount={notificaciones.filter((n) => !n.leida).length}
        onOpenNotifications={() => setIsNotificationsDrawerOpen(true)}
        onOpenPermissionsPrompt={() => setIsPermissionsPromptOpen(true)}
        needsPermissions={needsPermissions}
      />

      {/* Mode Switcher Bar: Almacén vs Retirar (centrado sobre el resumen y debajo de la barra principal) */}
      {isAdmin && (
        <div className="w-full bg-zinc-950/85 border-b border-zinc-800/80 backdrop-blur-md sticky top-14 sm:top-16 z-30 py-2 px-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="inline-flex items-center bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800 shadow-md">
              <button
                type="button"
                onClick={() => setAdminViewMode('admin')}
                className={`px-5 sm:px-7 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  adminViewMode === 'admin'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Almacén</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminViewMode('technician')}
                className={`px-5 sm:px-7 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  adminViewMode === 'technician'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Retirar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-3 pb-2">
        {isAdmin && adminViewMode === 'admin' ? (
          <AdminDashboard
            herramientas={herramientas}
            prestamos={prestamos}
            usuarios={usuarios}
            solicitudes={solicitudes}
            transferencias={transferencias}
            onOpenQuickScanner={() => setIsQuickScannerOpen(true)}
            onSwitchToTechnician={() => setAdminViewMode('technician')}
          />
        ) : (
          <TechnicianDashboard
            herramientas={herramientas}
            prestamos={prestamos}
            solicitudes={solicitudes}
            transferencias={transferencias}
            usuarios={usuarios}
            onSwitchToAdmin={isAdmin ? () => setAdminViewMode('admin') : undefined}
          />
        )}
      </main>

      {/* Footer minimal sin exceso de espacio negro */}
      <footer className="w-full py-2.5 pb-16 md:pb-3 border-t border-zinc-900/80 text-center text-[11px] text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px]">
          <p>Control de Herramientas • Trazabilidad e Inventario</p>
          <p className="font-mono text-[10px] text-zinc-600">Firebase Firestore & Auth Connected</p>
        </div>
      </footer>

      {/* Quick Scanner Modal */}
      <QuickScannerModal
        isOpen={isQuickScannerOpen}
        onClose={() => setIsQuickScannerOpen(false)}
        herramientas={herramientas}
        onSelectTool={handleSelectScannedTool}
      />

      {/* Barcode Modal */}
      <BarcodeModal
        isOpen={isBarcodeModalOpen}
        onClose={() => {
          setIsBarcodeModalOpen(false);
          setScannedTool(null);
        }}
        herramienta={scannedTool}
      />

      {/* Permissions Prompt Modal for Mobile / PWA */}
      <PermissionsPromptModal
        isOpen={isPermissionsPromptOpen}
        onClose={() => setIsPermissionsPromptOpen(false)}
        onPermissionsUpdated={async () => {
          const loc = await checkLocationPermission();
          const notif = checkNotificationPermission();
          setNeedsPermissions(loc !== 'granted' || notif !== 'granted');
        }}
      />

      {/* Notifications Drawer Modal */}
      <NotificationDrawerModal
        isOpen={isNotificationsDrawerOpen}
        onClose={() => setIsNotificationsDrawerOpen(false)}
        notificaciones={notificaciones}
        onOpenPermissionsPrompt={() => {
          setIsNotificationsDrawerOpen(false);
          setIsPermissionsPromptOpen(true);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainContent />
      </ToastProvider>
    </AuthProvider>
  );
}
