import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Bell, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  X, 
  Smartphone,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { 
  checkLocationPermission, 
  requestLocationPermission, 
  LocationPermissionState 
} from '../../services/geoService';
import { 
  checkNotificationPermission, 
  requestNotificationPermission 
} from '../../services/notificationService';
import { useToast } from '../../contexts/ToastContext';

interface PermissionsPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsUpdated?: () => void;
}

export const PermissionsPromptModal: React.FC<PermissionsPromptModalProps> = ({
  isOpen,
  onClose,
  onPermissionsUpdated,
}) => {
  const { showToast } = useToast();

  const [locationState, setLocationState] = useState<LocationPermissionState>('prompt');
  const [notificationState, setNotificationState] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  
  const [requestingLoc, setRequestingLoc] = useState(false);
  const [requestingNotif, setRequestingNotif] = useState(false);

  const checkAllPermissions = async () => {
    const loc = await checkLocationPermission();
    setLocationState(loc);

    const notif = checkNotificationPermission();
    setNotificationState(notif);
  };

  useEffect(() => {
    if (isOpen) {
      checkAllPermissions();
    }
  }, [isOpen]);

  const handleRequestLocation = async () => {
    setRequestingLoc(true);
    try {
      const res = await requestLocationPermission();
      await checkAllPermissions();
      if (res.granted) {
        showToast('success', 'Ubicación concedida', 'El GPS está activo para registrar traspasos y retiros.');
      } else {
        showToast('warning', 'Aviso de GPS', res.error || 'No se concedió acceso a la ubicación.');
      }
      onPermissionsUpdated?.();
    } catch (err: any) {
      showToast('error', 'Error de permisos', err.message);
    } finally {
      setRequestingLoc(false);
    }
  };

  const handleRequestNotification = async () => {
    setRequestingNotif(true);
    try {
      const granted = await requestNotificationPermission();
      await checkAllPermissions();
      if (granted) {
        showToast('success', 'Notificaciones activas', 'Recibirás avisos de solicitudes y traspasos en tu teléfono.');
      } else {
        showToast('info', 'Notificaciones pendientes', 'Puedes activarlas en cualquier momento en los ajustes.');
      }
      onPermissionsUpdated?.();
    } catch (err: any) {
      showToast('error', 'Error al solicitar notificaciones', err.message);
    } finally {
      setRequestingNotif(false);
    }
  };

  const handleGrantAll = async () => {
    await handleRequestLocation();
    await handleRequestNotification();
  };

  if (!isOpen) return null;

  const allGranted = locationState === 'granted' && notificationState === 'granted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Configuración del Teléfono</h3>
              <p className="text-[11px] text-zinc-400">Permisos para funcionamiento completo</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Al usar esta aplicación en tu teléfono, se requieren dos permisos clave para registrar la custodia de herramientas y recibir avisos de campo:
          </p>

          {/* 1. UBICACIÓN GPS */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            locationState === 'granted' 
              ? 'bg-emerald-950/20 border-emerald-500/30' 
              : locationState === 'denied'
              ? 'bg-rose-950/20 border-rose-500/30'
              : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  locationState === 'granted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">Ubicación GPS</h4>
                    {locationState === 'granted' && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Activa
                      </span>
                    )}
                    {locationState === 'denied' && (
                      <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" /> Bloqueada
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Certifica los retiros en almacén y la entrega de herramientas en mano entre compañeros en campo.
                  </p>
                  {locationState === 'denied' && (
                    <p className="text-[10px] text-rose-300/90 mt-1 bg-rose-500/10 p-1.5 rounded-lg">
                      Debes desbloquear el permiso de ubicación en los ajustes del sitio o navegador del teléfono.
                    </p>
                  )}
                </div>
              </div>

              {locationState !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={requestingLoc}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shrink-0 transition-all shadow-md shadow-amber-500/20 flex items-center gap-1 active:scale-95 disabled:opacity-50"
                >
                  {requestingLoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Activar</span>}
                </button>
              )}
            </div>
          </div>

          {/* 2. NOTIFICACIONES */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            notificationState === 'granted' 
              ? 'bg-emerald-950/20 border-emerald-500/30' 
              : notificationState === 'denied'
              ? 'bg-rose-950/20 border-rose-500/30'
              : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  notificationState === 'granted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">Notificaciones Push</h4>
                    {notificationState === 'granted' && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Activas
                      </span>
                    )}
                    {notificationState === 'denied' && (
                      <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" /> Bloqueadas
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Te avisa con sonido y notificación en pantalla cuando se apruebe tu solicitud o te traspasen una herramienta.
                  </p>
                  {notificationState === 'denied' && (
                    <p className="text-[10px] text-rose-300/90 mt-1 bg-rose-500/10 p-1.5 rounded-lg">
                      Notificaciones bloqueadas. Habilítalas desde la barra de direcciones o ajustes de la app.
                    </p>
                  )}
                </div>
              </div>

              {notificationState !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestNotification}
                  disabled={requestingNotif}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold shrink-0 transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                >
                  {requestingNotif ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Activar</span>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            {allGranted ? 'Cerrar' : 'Recordar más tarde'}
          </button>

          {!allGranted ? (
            <button
              type="button"
              onClick={handleGrantAll}
              disabled={requestingLoc || requestingNotif}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Conceder Todos los Permisos</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Listo, Todo Configurado</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
