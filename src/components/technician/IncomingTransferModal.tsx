import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  MapPin, 
  User, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Wrench, 
  Clock, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { TransferenciaCampo, CondicionHerramienta, GeoLocationPoint } from '../../types';
import { confirmarTransferenciaCampo, rechazarTransferenciaCampo } from '../../services/toolService';
import { captureCurrentLocation, calculateDistanceMeters, formatDistance, getGoogleMapsUrl, PRESENCE_DISTANCE_THRESHOLD_METERS } from '../../services/geoService';
import { useToast } from '../../contexts/ToastContext';
import { GpsRequirementNotice } from '../common/GpsRequirementNotice';

interface IncomingTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferencia: TransferenciaCampo | null;
  onSuccess: () => void;
}

const CONDICIONES: { value: CondicionHerramienta; label: string; color: string; activeColor: string }[] = [
  { 
    value: 'Excelente', 
    label: 'Excelente', 
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    activeColor: 'bg-emerald-500 text-black font-black' 
  },
  { 
    value: 'Bueno', 
    label: 'Bueno', 
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    activeColor: 'bg-cyan-500 text-black font-black' 
  },
  { 
    value: 'Desgaste normal', 
    label: 'Desgaste normal', 
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    activeColor: 'bg-amber-500 text-black font-black' 
  },
  { 
    value: 'Dañada / Requiere servicio', 
    label: 'Con detalles / Dañada', 
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    activeColor: 'bg-rose-500 text-white font-black' 
  },
];

export const IncomingTransferModal: React.FC<IncomingTransferModalProps> = ({
  isOpen,
  onClose,
  transferencia,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [condicionReceptor, setCondicionReceptor] = useState<CondicionHerramienta>('Bueno');
  const [observacionesReceptor, setObservacionesReceptor] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false);

  // GPS State
  const [currentGps, setCurrentGps] = useState<GeoLocationPoint | null>(null);
  const [loadingGps, setLoadingGps] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && transferencia) {
      setCondicionReceptor(transferencia.condicionEntrega || 'Bueno');
      setLoadingGps(true);
      captureCurrentLocation()
        .then((loc) => {
          setCurrentGps(loc);
        })
        .finally(() => {
          setLoadingGps(false);
        });
    }
  }, [isOpen, transferencia]);

  if (!isOpen || !transferencia) return null;

  // Calculate distance between both technicians
  let distanceMeters: number | null = null;
  if (transferencia.geoEmisor && currentGps) {
    distanceMeters = calculateDistanceMeters(
      transferencia.geoEmisor.latitude,
      transferencia.geoEmisor.longitude,
      currentGps.latitude,
      currentGps.longitude
    );
  }

  const isPresent = distanceMeters !== null ? distanceMeters <= PRESENCE_DISTANCE_THRESHOLD_METERS : false;

  const handleConfirm = async () => {
    let finalGps = currentGps;
    if (!finalGps) {
      setLoadingGps(true);
      finalGps = await captureCurrentLocation();
      setLoadingGps(false);
      if (finalGps) setCurrentGps(finalGps);
    }

    if (!finalGps) {
      showToast('error', 'GPS Obligatorio', 'Debes tener la ubicación encendida para confirmar la recepción del traspaso.');
      return;
    }

    setIsProcessing(true);
    try {
      await confirmarTransferenciaCampo(
        transferencia,
        condicionReceptor,
        observacionesReceptor.trim(),
        finalGps
      );

      showToast(
        'success',
        '¡Herramienta recibida con éxito!',
        `La herramienta ${transferencia.herramientaNombre} ahora está asignada a ti con registro de geolocalización.`
      );

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error confirming transfer:', err);
      showToast('error', 'Error', 'No se pudo confirmar la recepción del traspaso.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!motivoRechazo.trim()) {
      showToast('warning', 'Motivo requerido', 'Por favor especifica por qué rechazas la herramienta.');
      return;
    }

    setIsProcessing(true);
    try {
      await rechazarTransferenciaCampo(transferencia.id!, motivoRechazo.trim());
      showToast('info', 'Traspaso rechazado', 'Se notificó el rechazo al técnico emisor.');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error rejecting transfer:', err);
      showToast('error', 'Error', 'No se pudo rechazar el traspaso.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black animate-pulse">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">
                Confirmar Recepción en Campo
              </h3>
              <p className="text-xs text-zinc-400">
                {transferencia.tecnicoEmisorNombre} te está entregando una herramienta
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Tool Card */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shrink-0 font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400">{transferencia.herramientaCodigo}</span>
                <span className="text-[10px] text-zinc-500 font-mono">#{transferencia.nroTransferencia}</span>
              </div>
              <h4 className="text-sm font-bold text-white truncate">{transferencia.herramientaNombre}</h4>
              <p className="text-xs text-zinc-400">{transferencia.herramientaMarca}</p>
            </div>
          </div>

          {/* Sender details and Reported Condition */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Entregado por:</span>
              <span className="font-bold text-white flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                {transferencia.tecnicoEmisorNombre}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Estado reportado al entregar:</span>
              <span className="font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px]">
                {transferencia.condicionEntrega}
              </span>
            </div>

            {transferencia.observaciones && (
              <div className="pt-2 border-t border-zinc-900 text-zinc-300 italic text-[11px]">
                "{transferencia.observaciones}"
              </div>
            )}
          </div>

          {/* Geolocation Comparison Card */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                Auditoría GPS de Presencia Física:
              </span>
              {loadingGps ? (
                <span className="text-[10px] text-amber-400 animate-pulse">Detectando GPS...</span>
              ) : distanceMeters !== null ? (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  isPresent 
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {isPresent ? 'Presencial (Mismo lugar)' : 'A distancia'}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-500">Sin datos GPS</span>
              )}
            </div>

            {distanceMeters !== null && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px]">
                <span className="text-zinc-400">Distancia entre ambos técnicos:</span>
                <span className="font-black text-amber-400 font-mono">
                  {formatDistance(distanceMeters)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-zinc-400 pt-1">
              <div>
                <p className="font-bold text-zinc-300">GPS Emisor:</p>
                {transferencia.geoEmisor ? (
                  <a
                    href={getGoogleMapsUrl(transferencia.geoEmisor.latitude, transferencia.geoEmisor.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>{transferencia.geoEmisor.latitude}, {transferencia.geoEmisor.longitude}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span>No registrado</span>
                )}
              </div>

              <div>
                <p className="font-bold text-zinc-300">Tu GPS (Receptor):</p>
                {currentGps ? (
                  <a
                    href={getGoogleMapsUrl(currentGps.latitude, currentGps.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>{currentGps.latitude}, {currentGps.longitude}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span>Obteniendo...</span>
                )}
              </div>
            </div>
          </div>

          {/* Condition check by recipient */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              ¿En qué estado confirmas recibir la herramienta?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CONDICIONES.map((c) => {
                const isSelected = condicionReceptor === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCondicionReceptor(c.value)}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border text-center transition-all ${
                      isSelected ? c.activeColor : `${c.color} hover:bg-zinc-800`
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Observations */}
          <div>
            <input
              type="text"
              value={observacionesReceptor}
              onChange={(e) => setObservacionesReceptor(e.target.value)}
              placeholder="Tus observaciones al recibir en mano (opcional)..."
              className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Mandatory GPS notice */}
          <GpsRequirementNotice
            gps={currentGps}
            loading={loadingGps}
            onGpsAcquired={setCurrentGps}
            actionName="confirmar la recepción del traspaso en campo"
          />

          {/* Reject Section Toggle */}
          {showRejectInput ? (
            <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-900/50 space-y-2">
              <label className="block text-xs font-bold text-rose-300">
                Motivo del rechazo de la herramienta:
              </label>
              <textarea
                rows={2}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ej: La herramienta no enciende, no es el modelo acordado..."
                className="w-full px-3 py-2 bg-zinc-950 border border-rose-800 rounded-xl text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectInput(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isProcessing || !motivoRechazo.trim()}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-40"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowRejectInput(true)}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
              >
                No acepto esta herramienta (Rechazar)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showRejectInput && (
          <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/90 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing || !currentGps || loadingGps}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black text-xs font-black transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isProcessing ? 'Confirmando recepción...' : !currentGps ? 'Activar GPS para Recibir' : 'Aceptar y Recibir Herramienta'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
