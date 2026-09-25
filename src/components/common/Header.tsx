import React from 'react';
import { 
  Wrench, 
  ShieldCheck, 
  UserCheck, 
  LogOut, 
  Sun, 
  Moon,
  Bell,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onOpenScanner?: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onOpenPermissionsPrompt?: () => void;
  needsPermissions?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenScanner,
  isDarkMode,
  onToggleTheme,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenPermissionsPrompt,
  needsPermissions = false,
}) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      showToast('info', 'Sesión cerrada', 'Has cerrado sesión exitosamente.');
    } catch (err) {
      showToast('error', 'Error al cerrar sesión', 'Inténtalo de nuevo.');
    }
  };

  const displayName = userProfile?.nombre || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario';

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* User Name in the corner instead of 'Control de Herramientas' */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30 shrink-0">
            <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white truncate max-w-[160px] sm:max-w-xs">
                {displayName}
              </h1>
              <span className={`text-[9px] sm:text-[10px] uppercase font-black tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${
                isAdmin 
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}>
                {isAdmin ? 'Admin' : 'Técnico'}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-400 truncate hidden sm:block">
              {isAdmin ? 'Control de Herramientas • Administración' : 'Control de Herramientas • Almacén'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Permissions Status / Settings Button */}
          {onOpenPermissionsPrompt && (
            <button
              onClick={onOpenPermissionsPrompt}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all relative ${
                needsPermissions
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 animate-pulse'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Ajustes de permisos del teléfono (GPS y Notificaciones)"
              aria-label="Permisos del teléfono"
            >
              <Smartphone className="w-4 h-4" />
              {needsPermissions && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-zinc-950" />
              )}
            </button>
          )}

          {/* Notifications Drawer Button */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all relative active:scale-95"
              title="Notificaciones del sistema"
              aria-label="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] text-[9px] font-black rounded-full bg-amber-500 text-black flex items-center justify-center animate-bounce">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Cambiar tema"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Logout button */}
          {currentUser && (
            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/50 border border-zinc-800 hover:border-rose-800/60 text-zinc-400 hover:text-rose-400 transition-colors"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
