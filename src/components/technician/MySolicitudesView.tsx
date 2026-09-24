import React, { useState } from 'react';
import { 
  Layers, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  FileText, 
  User, 
  Ban, 
  Wrench,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SolicitudRetiro } from '../../types';
import { cancelarSolicitudRetiro } from '../../services/toolService';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface MySolicitudesViewProps {
  solicitudes: SolicitudRetiro[];
  onGoToCatalog: () => void;
}

export const MySolicitudesView: React.FC<MySolicitudesViewProps> = ({
  solicitudes,
  onGoToCatalog,
}) => {
  const { showToast } = useToast();
  const [filterState, setFilterState] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [solicitudToCancel, setSolicitudToCancel] = useState<SolicitudRetiro | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const filteredSolicitudes = solicitudes.filter((sol) => {
    if (filterState === 'all') return true;
    return sol.estado === filterState;
  });

  const handleConfirmCancel = async () => {
    if (!solicitudToCancel?.id) return;
    setIsCancelling(true);
    try {
      await cancelarSolicitudRetiro(solicitudToCancel.id);
      showToast('info', 'Solicitud Cancelada', `La solicitud ${solicitudToCancel.nroSolicitud} fue cancelada.`);
      setSolicitudToCancel(null);
    } catch (err) {
      console.error('Error cancelling solicitud:', err);
      showToast('error', 'Error', 'No se pudo cancelar la solicitud.');
    } finally {
      setIsCancelling(false);
    }
  };

  const pendingCount = solicitudes.filter((s) => s.estado === 'Pendiente').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-400" />
            Mis Solicitudes de Retiro
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Estado de tus peticiones de herramientas pendientes de autorización por los administradores
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{pendingCount} pendiente(s) de autorización</span>
            </div>
          )}

          <button
            onClick={onGoToCatalog}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Nueva Solicitud de Retiro</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setFilterState('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            filterState === 'all'
              ? 'bg-zinc-800 text-white font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Todas ({solicitudes.length})
        </button>
        <button
          onClick={() => setFilterState('Pendiente')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            filterState === 'Pendiente'
              ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
              : 'text-zinc-400 hover:text-amber-400'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pendientes ({solicitudes.filter((s) => s.estado === 'Pendiente').length})</span>
        </button>
        <button
          onClick={() => setFilterState('Aprobada')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            filterState === 'Aprobada'
              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
              : 'text-zinc-400 hover:text-emerald-400'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Aprobadas ({solicitudes.filter((s) => s.estado === 'Aprobada').length})</span>
        </button>
        <button
          onClick={() => setFilterState('Rechazada')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            filterState === 'Rechazada'
              ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
              : 'text-zinc-400 hover:text-rose-400'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Rechazadas ({solicitudes.filter((s) => s.estado === 'Rechazada').length})</span>
        </button>
      </div>

      {/* Requests List */}
      {filteredSolicitudes.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
          <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-zinc-300">No hay solicitudes en esta sección</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Puedes explorar el catálogo de almacén y presionar "+ Solicitar Retiro" para preparar tus pedidos de herramientas.
          </p>
          <button
            onClick={onGoToCatalog}
            className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all shadow-md"
          >
            Explorar Catálogo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSolicitudes.map((sol) => {
            const isPending = sol.estado === 'Pendiente';
            const isApproved = sol.estado === 'Aprobada';
            const isRejected = sol.estado === 'Rechazada';
            const isCancelled = sol.estado === 'Cancelada';
            const isExpanded = expandedId === sol.id;

            return (
              <div
                key={sol.id || sol.nroSolicitud}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl transition-all hover:border-zinc-700/80"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      {sol.nroSolicitud}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {sol.cantidadTotal} {sol.cantidadTotal === 1 ? 'Herramienta solicitada' : 'Herramientas solicitadas'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Fecha: {new Date(sol.fechaSolicitud).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 ${
                        isPending
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : isApproved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isRejected
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {isPending && <Clock className="w-3.5 h-3.5 animate-pulse" />}
                      {isApproved && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isRejected && <XCircle className="w-3.5 h-3.5" />}
                      {isCancelled && <Ban className="w-3.5 h-3.5" />}
                      {isPending ? 'Pendiente de Autorización' : sol.estado}
                    </span>

                    {isPending && (
                      <button
                        onClick={() => setSolicitudToCancel(sol)}
                        className="px-2.5 py-1 text-[11px] text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                        title="Cancelar solicitud"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs text-zinc-300">
                  {sol.fechaEstimadaDevolucion ? (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Devolución Estimada:</span>
                      <strong className="text-zinc-200">
                        {new Date(sol.fechaEstimadaDevolucion).toLocaleString()}
                      </strong>
                    </div>
                  ) : null}

                  {sol.motivoUso && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span>Motivo / Obra:</span>
                      <strong className="text-zinc-200 truncate">{sol.motivoUso}</strong>
                    </div>
                  )}
                </div>

                {/* Resolution info if approved or rejected */}
                {isApproved && (
                  <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-200">
                        ¡Retiro Autorizado por {sol.adminRespuestaNombre || 'Administrador'}!
                      </p>
                      <p className="text-[11px] text-emerald-400 mt-0.5">
                        Las herramientas ya están cargadas en tu sección "Mis Herramientas Asignadas".
                      </p>
                    </div>
                  </div>
                )}

                {isRejected && (
                  <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-rose-200">
                        Solicitud rechazada por {sol.adminRespuestaNombre || 'Administrador'}
                      </p>
                      {sol.motivoRechazo && (
                        <p className="text-[11px] text-rose-400 mt-0.5">
                          Motivo: "{sol.motivoRechazo}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Items breakdown */}
                <div className="pt-2 border-t border-zinc-800/80">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : sol.id!)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-zinc-400 hover:text-white py-1 transition-colors"
                  >
                    <span>Ver detalle de herramientas ({sol.herramientas.length})</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                      {sol.herramientas.map((h, idx) => (
                        <div
                          key={h.herramientaId || idx}
                          className="text-xs py-2 border-b border-zinc-800/40 last:border-0 space-y-1"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{h.codigo}</span>
                              <span className="text-zinc-200 font-bold">{h.nombre}</span>
                              <span className="text-[11px] text-zinc-500">({h.marca})</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {h.estadoRetiro && (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  h.estadoRetiro === 'Excelente' 
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : h.estadoRetiro === 'Bueno'
                                    ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                                    : h.estadoRetiro === 'Desgaste normal'
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                }`}>
                                  Estado al retirar: {h.estadoRetiro}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                                {h.categoria}
                              </span>
                            </div>
                          </div>

                          {h.observacionesRetiro && (
                            <p className="text-[11px] text-zinc-400 italic bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800">
                              💬 Obs: "{h.observacionesRetiro}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal to cancel */}
      <ConfirmationModal
        isOpen={!!solicitudToCancel}
        onClose={() => setSolicitudToCancel(null)}
        onConfirm={handleConfirmCancel}
        title="Cancelar Solicitud de Retiro"
        message={`¿Estás seguro de que deseas cancelar la solicitud ${solicitudToCancel?.nroSolicitud}? Ya no será enviada a los administradores.`}
        confirmText="Sí, Cancelar Solicitud"
        cancelText="No, Mantener Solicitud"
        isDestructive={true}
        isLoading={isCancelling}
      />
    </div>
  );
};
