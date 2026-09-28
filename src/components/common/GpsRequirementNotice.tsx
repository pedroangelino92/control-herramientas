import React, { useState } from 'react';
import { MapPin, AlertTriangle, RefreshCw, CheckCircle2, Loader2, Navigation, Radio, Compass } from 'lucide-react';
import { GeoLocationPoint } from '../../types';
import { captureCurrentLocation, requestLocationPermission, getAccuracyQuality } from '../../services/geoService';
import { useToast } from '../../contexts/ToastContext';

interface GpsRequirementNoticeProps {
  gps: GeoLocationPoint | null;
  loading: boolean;
  onGpsAcquired: (point: GeoLocationPoint | null) => void;
  actionName?: string; // e.g. "solicitar el retiro", "autorizar la entrega", "traspasar la herramienta"
  compact?: boolean;
}

export const GpsRequirementNotice: React.FC<GpsRequirementNoticeProps> = ({
  gps,
  loading,
  onGpsAcquired,
  actionName = 'completar esta operación',
  compact = false,
}) => {
  const { showToast } = useToast();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const permResult = await requestLocationPermission();
      if (!permResult.granted && permResult.error) {
        showToast('warning', 'Permiso de ubicación', permResult.error);
      }
      
      const loc = await captureCurrentLocation();
      onGpsAcquired(loc);

      if (loc) {
        showToast('success', 'Ubicación obtenida', 'GPS activo y validado para la operación.');
      } else {
        showToast('error', 'GPS no disponible', 'Por favor verifica que la ubicación de tu teléfono esté activada.');
      }
    } catch (err: any) {
      showToast('error', 'Error GPS', err.message || 'No se pudo obtener la ubicación.');
    } finally {
      setRetrying(false);
    }
  };

  const isBusy = loading || retrying;

  // Case 1: GPS successfully acquired
  if (gps) {
    const accuracyInfo = getAccuracyQuality(gps.accuracy);

    if (compact) {
      return (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">GPS: {gps.latitude.toFixed(4)}, {gps.longitude.toFixed(4)}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${accuracyInfo.colorClass}`}>
              {accuracyInfo.shortLabel}
            </span>
          </span>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isBusy}
            title="Actualizar posición GPS"
            className="text-[10px] text-emerald-400 hover:text-emerald-200 underline shrink-0"
          >
            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Actualizar'}
          </button>
        </div>
      );
    }

    return (
      <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-white text-[11px] truncate">
                Ubicación GPS registrada
              </p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-bold flex items-center gap-1 ${accuracyInfo.colorClass}`}>
                <Radio className="w-2.5 h-2.5" />
                {accuracyInfo.label}
              </span>
            </div>
            <p className="text-[10px] text-emerald-300/80 font-mono truncate mt-0.5">
              Lat: {gps.latitude.toFixed(5)} • Lon: {gps.longitude.toFixed(5)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          disabled={isBusy}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[10px] font-bold transition-all flex items-center gap-1 shrink-0"
        >
          {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          <span>Actualizar</span>
        </button>
      </div>
    );
  }

  // Case 2: Loading / Acquiring
  if (isBusy) {
    return (
      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-300">
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-[11px] block">Sintonizando señal GPS...</span>
            <span className="text-[10px] text-amber-300/80">Si estás en un sótano o almacén techado, acércate a una puerta o ventana.</span>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: GPS Missing / Denied / Off -> HARD BLOCKING UI
  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-rose-500/15 border-2 border-rose-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <h5 className="font-black text-rose-300 text-xs flex items-center gap-1">
            Ubicación GPS Requerida
          </h5>
          <p className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
            Debes encender la ubicación del teléfono para poder {actionName}.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRetry}
        disabled={isBusy}
        className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-black text-xs font-black transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
      >
        <Navigation className="w-3.5 h-3.5 fill-black" />
        <span>Encender / Reintentar GPS</span>
      </button>
    </div>
  );
};
