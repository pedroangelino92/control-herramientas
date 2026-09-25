import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  MapPin, 
  User, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Wrench, 
  Clock, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Herramienta, Usuario, CondicionHerramienta, GeoLocationPoint, Prestamo } from '../../types';
import { createTransferenciaCampo } from '../../services/toolService';
import { captureCurrentLocation, getGoogleMapsUrl } from '../../services/geoService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { GpsRequirementNotice } from '../common/GpsRequirementNotice';

interface TransferInFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  tool: Herramienta | null;
  activeLoans: Prestamo[];
  usuarios: Usuario[];
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

export const TransferInFieldModal: React.FC<TransferInFieldModalProps> = ({
  isOpen,
  onClose,
  tool,
  activeLoans,
  usuarios,
  onSuccess,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();

  const [selectedRecipientUid, setSelectedRecipientUid] = useState<string>('');
  const [condicion, setCondicion] = useState<CondicionHerramienta>('Bueno');
  const [observaciones, setObservaciones] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // GPS State
  const [currentGps, setCurrentGps] = useState<GeoLocationPoint | null>(null);
  const [loadingGps, setLoadingGps] = useState<boolean>(false);

  // Filter available technicians to transfer to (exclude current user)
  const otherTechnicians = usuarios.filter(
    (u) => u.uid !== currentUser?.uid && u.estado === 'activo'
  );

  // Get corresponding loan
  const correspondingLoan = tool ? activeLoans.find((l) => l.herramientaId === tool.id && l.estado === 'Activo') : null;

  // Capture GPS on open
  useEffect(() => {
    if (isOpen) {
      setLoadingGps(true);
      captureCurrentLocation()
        .then((loc) => {
          setCurrentGps(loc);
        })
        .finally(() => {
          setLoadingGps(false);
        });
    }
  }, [isOpen]);

  if (!isOpen || !tool) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientUid) {
      setErrorMsg('Por favor selecciona el técnico que recibirá la herramienta en campo.');
      return;
    }

    const recipient = usuarios.find((u) => u.uid === selectedRecipientUid);
    if (!recipient) {
      setErrorMsg('Técnico receptor no válido.');
      return;
    }

    setErrorMsg(null);

    // Re-capture fresh GPS if possible
    let finalGps = currentGps;
    if (!finalGps) {
      setLoadingGps(true);
      finalGps = await captureCurrentLocation();
      setLoadingGps(false);
      if (finalGps) setCurrentGps(finalGps);
    }

    if (!finalGps) {
      setErrorMsg('Ubicación GPS obligatoria: Debes activar la ubicación del teléfono para poder iniciar el traspaso en campo.');
      showToast('error', 'GPS Obligatorio', 'Debes activar la ubicación del teléfono para realizar el traspaso.');
      return;
    }

    setIsSubmitting(true);

    try {
      const emisorNombre = userProfile?.nombre || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Técnico';
      const emisorEmail = userProfile?.email || currentUser?.email || '';

      await createTransferenciaCampo({
        herramienta: tool,
        prestamoOrigenId: correspondingLoan?.id,
        tecnicoEmisorUid: currentUser?.uid || '',
        tecnicoEmisorNombre: emisorNombre,
        tecnicoEmisorEmail: emisorEmail,
        tecnicoReceptorUid: recipient.uid,
        tecnicoReceptorNombre: recipient.nombre,
        tecnicoReceptorEmail: recipient.email,
        condicionEntrega: condicion,
        observaciones: observaciones.trim(),
        geoEmisor: finalGps,
      });

      showToast(
        'success',
        'Traspaso en campo iniciado',
        `Se notificó a ${recipient.nombre}. La herramienta se transferirá cuando él confirme la recepción con su ubicación.`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error initiating transfer:', err);
      setErrorMsg('No se pudo registrar el traspaso en campo. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
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
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Traspaso en Campo (Mano a Mano)
              </h3>
              <p className="text-xs text-zinc-400">
                Pasa la herramienta a otro compañero en el lugar de trabajo
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tool Card */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shrink-0 font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400">{tool.codigo}</span>
                <span className="text-[10px] text-zinc-500">{tool.categoria}</span>
              </div>
              <h4 className="text-sm font-bold text-white truncate">{tool.nombre}</h4>
              <p className="text-xs text-zinc-400">{tool.marca} {tool.modelo && `• ${tool.modelo}`}</p>
            </div>
          </div>

          {/* GPS Tracking Badge */}
          <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Geolocalización de Entrega (Tu GPS):
              </span>
              {loadingGps ? (
                <span className="text-[10px] text-amber-400 animate-pulse">Obteniendo coordenadas...</span>
              ) : currentGps ? (
                <a
                  href={getGoogleMapsUrl(currentGps.latitude, currentGps.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>Ver en Mapa</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] text-zinc-500">GPS no disponible</span>
              )}
            </div>

            {currentGps && (
              <div className="font-mono text-[11px] text-zinc-300 flex items-center gap-2">
                <span>Lat: {currentGps.latitude}, Lng: {currentGps.longitude}</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  ±{currentGps.accuracy}m
                </span>
              </div>
            )}
            <p className="text-[10px] text-zinc-500">
              Quedará registrado el punto exacto donde realizas el traspaso.
            </p>
          </div>

          {/* Recipient Technician */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              ¿A qué técnico le entregas la herramienta en mano? *
            </label>
            <select
              required
              value={selectedRecipientUid}
              onChange={(e) => setSelectedRecipientUid(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Selecciona al técnico receptor...</option>
              {otherTechnicians.map((t) => (
                <option key={t.uid} value={t.uid}>
                  {t.nombre} ({t.email}) - {t.rol === 'admin' ? 'Administrador' : 'Técnico'}
                </option>
              ))}
            </select>
          </div>

          {/* Condition upon hand-off */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-1.5 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              Estado en el que entregas la herramienta:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CONDICIONES.map((c) => {
                const isSelected = condicion === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCondicion(c.value)}
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

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              Observaciones del traspaso (Opcional):
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Se entrega con maletín y 2 brocas en obra norte..."
              className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Mandatory GPS notice */}
          <GpsRequirementNotice
            gps={currentGps}
            loading={loadingGps}
            onGpsAcquired={setCurrentGps}
            actionName="iniciar el traspaso de la herramienta en campo"
          />

          {/* Security Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="text-[11px] leading-relaxed">
              El técnico receptor recibirá una notificación en su teléfono para confirmar la recepción con su propia geolocalización. El sistema calculará la distancia entre ambos para auditar que estaban en el mismo lugar.
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedRecipientUid || !currentGps || loadingGps}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-black transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Iniciando traspaso...' : !currentGps ? 'Activar GPS para Traspasar' : 'Iniciar Traspaso en Campo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
