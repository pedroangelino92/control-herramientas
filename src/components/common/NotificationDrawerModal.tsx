import React, { useState } from 'react';
import { 
  Bell, 
  CheckCheck, 
  X, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  ArrowLeftRight, 
  Wrench, 
  Clock, 
  Volume2,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { NotificacionSistema } from '../../types';
import { 
  marcarNotificacionLeida, 
  marcarTodasNotificacionesLeidas,
  showDeviceNotification 
} from '../../services/notificationService';
import { useToast } from '../../contexts/ToastContext';

interface NotificationDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificaciones: NotificacionSistema[];
  onOpenPermissionsPrompt?: () => void;
}

export const NotificationDrawerModal: React.FC<NotificationDrawerModalProps> = ({
  isOpen,
  onClose,
  notificaciones,
  onOpenPermissionsPrompt,
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'todas' | 'no_leidas'>('todas');

  if (!isOpen) return null;

  const unreadCount = notificaciones.filter((n) => !n.leida).length;
  const filteredNotifs = filter === 'no_leidas' 
    ? notificaciones.filter((n) => !n.leida) 
    : notificaciones;

  const handleMarkAllRead = async () => {
    const unreadIds = notificaciones.filter((n) => !n.leida && n.id).map((n) => n.id!);
    if (unreadIds.length === 0) return;
    await marcarTodasNotificacionesLeidas(unreadIds);
    showToast('info', 'Notificaciones al día', 'Todas las notificaciones se marcaron como leídas.');
  };

  const handleNotificationClick = async (notif: NotificacionSistema) => {
    if (!notif.leida && notif.id) {
      await marcarNotificacionLeida(notif.id);
    }
  };

  const handleTestNotification = () => {
    showDeviceNotification('Control de Herramientas', {
      body: '¡Excelente! Tu teléfono recibe las alertas sonoras y notificaciones del sistema.',
      tag: 'test-ping',
    });
    showToast('success', 'Prueba enviada', 'Comprueba la barra de estado y sonido de tu teléfono.');
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 60) return 'Hace un momento';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return past.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  const renderIcon = (tipo: string) => {
    switch (tipo) {
      case 'solicitud':
        return <Layers className="w-4 h-4 text-amber-400" />;
      case 'aprobacion':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'rechazo':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'traspaso':
        return <ArrowLeftRight className="w-4 h-4 text-cyan-400" />;
      default:
        return <Wrench className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md h-[90vh] sm:h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white truncate">Centro de Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-black">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 truncate">Avisos de solicitudes, traspasos y almacén</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar & Quick Actions */}
        <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setFilter('todas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filter === 'todas'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todas ({notificaciones.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('no_leidas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filter === 'no_leidas'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sin leer ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar leídas</span>
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 p-2 sm:p-3 space-y-1.5">
          {filteredNotifs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-xs font-bold text-zinc-400">
                {filter === 'no_leidas' ? 'No tienes notificaciones pendientes' : 'Aún no hay notificaciones'}
              </p>
              <p className="text-[11px] text-zinc-500 max-w-xs">
                Cuando te aprueben retiros o envíen traspasos en campo, aparecerán aquí con avisos a tu teléfono.
              </p>
            </div>
          ) : (
            filteredNotifs.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  !notif.leida
                    ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-zinc-950/40 border-zinc-800/70 hover:border-zinc-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  !notif.leida ? 'bg-amber-500/20' : 'bg-zinc-800'
                }`}>
                  {renderIcon(notif.tipo)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className={`text-xs truncate ${!notif.leida ? 'font-black text-white' : 'font-bold text-zinc-300'}`}>
                      {notif.titulo}
                    </h4>
                    <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                      {formatTimeAgo(notif.fecha)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">
                    {notif.mensaje}
                  </p>
                </div>

                {!notif.leida && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer actions for phone test & permissions */}
        <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950/90 flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTestNotification}
            className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Probar Sonido y Notificación en Teléfono</span>
          </button>

          {onOpenPermissionsPrompt && (
            <button
              type="button"
              onClick={onOpenPermissionsPrompt}
              className="text-[11px] text-zinc-400 hover:text-amber-300 text-center transition-colors py-0.5"
            >
              Revisar permisos de GPS y Notificaciones
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
