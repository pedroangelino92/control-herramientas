import React, { useState, useMemo, useEffect } from 'react';
import { 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  User, 
  Calendar, 
  FileText, 
  Wrench, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Filter,
  Sparkles,
  MapPin,
  ExternalLink,
  Ban
} from 'lucide-react';
import { SolicitudRetiro, Herramienta, CondicionHerramienta, GeoLocationPoint } from '../../types';
import { autorizarSolicitudRetiro, rechazarSolicitudRetiro } from '../../services/toolService';
import { captureCurrentLocation, getGoogleMapsUrl } from '../../services/geoService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { GpsRequirementNotice } from '../common/GpsRequirementNotice';

interface SolicitudesManagementProps {
  solicitudes: SolicitudRetiro[];
  herramientas: Herramienta[];
}

export const SolicitudesManagement: React.FC<SolicitudesManagementProps> = ({
  solicitudes,
  herramientas,
}) => {
  const { userProfile, currentUser } = useAuth();
  const { showToast } = useToast();

  const [filterState, setFilterState] = useState<'all' | 'Pendiente' | 'Aprobada' | 'Rechazada'>('Pendiente');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Authorization Modal state
  const [solicitudToAuthorize, setSolicitudToAuthorize] = useState<SolicitudRetiro | null>(null);
  const [observacionesEntrega, setObservacionesEntrega] = useState('');
  const [condicionEntrega, setCondicionEntrega] = useState<CondicionHerramienta>('Bueno');
  const [perToolConditions, setPerToolConditions] = useState<
    Record<string, { condicion: CondicionHerramienta; observaciones: string }>
  >({});
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [adminGps, setAdminGps] = useState<GeoLocationPoint | null>(null);
  const [loadingAdminGps, setLoadingAdminGps] = useState(false);

  // Initialize tool conditions and capture GPS whenever authorization modal opens
  useEffect(() => {
    if (solicitudToAuthorize) {
      const initialMap: Record<string, { condicion: CondicionHerramienta; observaciones: string }> = {};
      solicitudToAuthorize.herramientas.forEach((h) => {
        initialMap[h.herramientaId] = {
          condicion: (h.estadoRetiro as CondicionHerramienta) || 'Bueno',
          observaciones: h.observacionesRetiro || '',
        };
      });
      setPerToolConditions(initialMap);
      setCondicionEntrega('Bueno');
      setObservacionesEntrega('');
      setLoadingAdminGps(true);
      captureCurrentLocation()
        .then((loc) => setAdminGps(loc))
        .finally(() => setLoadingAdminGps(false));
    } else {
      setAdminGps(null);
      setPerToolConditions({});
    }
  }, [solicitudToAuthorize]);

  const handleApplyConditionToAll = (newCond: CondicionHerramienta) => {
    setCondicionEntrega(newCond);
    setPerToolConditions((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = {
          ...updated[id],
          condicion: newCond,
        };
      });
      return updated;
    });
  };

  const handleUpdateToolCondition = (toolId: string, cond: CondicionHerramienta) => {
    setPerToolConditions((prev) => ({
      ...prev,
      [toolId]: {
        ...(prev[toolId] || { observaciones: '' }),
        condicion: cond,
      },
    }));
  };

  const handleUpdateToolObs = (toolId: string, obs: string) => {
    setPerToolConditions((prev) => ({
      ...prev,
      [toolId]: {
        ...(prev[toolId] || { condicion: 'Bueno' }),
        observaciones: obs,
      },
    }));
  };

  // Rejection Modal state
  const [solicitudToReject, setSolicitudToReject] = useState<SolicitudRetiro | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Filter requests
  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter((sol) => {
      const matchesFilter = filterState === 'all' || sol.estado === filterState;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        sol.nroSolicitud.toLowerCase().includes(term) ||
        sol.tecnicoNombre.toLowerCase().includes(term) ||
        sol.tecnicoEmail.toLowerCase().includes(term) ||
        (sol.motivoUso && sol.motivoUso.toLowerCase().includes(term)) ||
        sol.herramientas.some(
          (h) =>
            h.nombre.toLowerCase().includes(term) ||
            h.codigo.toLowerCase().includes(term) ||
            h.marca.toLowerCase().includes(term)
        );

      return matchesFilter && matchesSearch;
    });
  }, [solicitudes, filterState, searchTerm]);

  const pendingCount = solicitudes.filter((s) => s.estado === 'Pendiente').length;

  // Handle Authorize
  const handleConfirmAuthorize = async () => {
    if (!solicitudToAuthorize) return;

    let adminGeo = adminGps;
    if (!adminGeo) {
      setLoadingAdminGps(true);
      adminGeo = await captureCurrentLocation();
      setLoadingAdminGps(false);
      if (adminGeo) {
        setAdminGps(adminGeo);
      }
    }

    if (!adminGeo) {
      showToast('error', 'GPS Obligatorio', 'Debes tener la ubicación encendida para autorizar la entrega de herramientas.');
      return;
    }

    setIsAuthorizing(true);
    try {
      const adminNombre = userProfile?.nombre || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrador';

      await autorizarSolicitudRetiro(
        solicitudToAuthorize,
        currentUser?.uid || '',
        adminNombre,
        observacionesEntrega.trim(),
        condicionEntrega,
        adminGeo,
        perToolConditions
      );

      showToast(
        'success',
        '¡Solicitud Autorizada!',
        `Se han registrado los préstamos correspondientes para ${solicitudToAuthorize.tecnicoNombre}.`
      );

      setSolicitudToAuthorize(null);
      setObservacionesEntrega('');
    } catch (err: any) {
      console.error('Error authorizing solicitud:', err);
      showToast('error', 'Error al autorizar', err.message || 'Ocurrió un problema en la operación.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!solicitudToReject) return;
    if (!motivoRechazo.trim()) {
      showToast('warning', 'Campo requerido', 'Indica el motivo del rechazo.');
      return;
    }
    setIsRejecting(true);
    try {
      const adminNombre = userProfile?.nombre || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrador';
      await rechazarSolicitudRetiro(
        solicitudToReject.id!,
        currentUser?.uid || '',
        adminNombre,
        motivoRechazo.trim()
      );
      showToast('info', 'Solicitud Rechazada', `La solicitud ${solicitudToReject.nroSolicitud} fue rechazada.`);
      setSolicitudToReject(null);
      setMotivoRechazo('');
    } catch (err) {
      console.error('Error rejecting solicitud:', err);
      showToast('error', 'Error', 'No se pudo rechazar la solicitud.');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Compact Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3 sm:p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
              Autorización de Retiro de Herramientas
            </h2>
            <p className="text-[10px] text-zinc-400 truncate">
              Revisa, autoriza o rechaza solicitudes tramitadas por técnicos
            </p>
          </div>
        </div>

        {pendingCount > 0 ? (
          <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>{pendingCount} esperando autorización</span>
          </div>
        ) : (
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0 self-start sm:self-auto">
            ✓ Al día (sin pendientes)
          </span>
        )}
      </div>

      {/* Filter and Search Bar (Responsive & Compact) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2.5 sm:p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nro solicitud, técnico o herramienta..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
          <button
            onClick={() => setFilterState('Pendiente')}
            className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 shrink-0 ${
              filterState === 'Pendiente'
                ? 'bg-amber-500 text-black font-black shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Pendientes ({solicitudes.filter((s) => s.estado === 'Pendiente').length})</span>
          </button>

          <button
            onClick={() => setFilterState('all')}
            className={`px-3 py-1 rounded-lg transition-colors shrink-0 ${
              filterState === 'all'
                ? 'bg-amber-500 text-black font-black shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>Todas ({solicitudes.length})</span>
          </button>

          <button
            onClick={() => setFilterState('Aprobada')}
            className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 shrink-0 ${
              filterState === 'Aprobada'
                ? 'bg-amber-500 text-black font-black shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Aprobadas ({solicitudes.filter((s) => s.estado === 'Aprobada').length})</span>
          </button>

          <button
            onClick={() => setFilterState('Rechazada')}
            className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 shrink-0 ${
              filterState === 'Rechazada'
                ? 'bg-amber-500 text-black font-black shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>Rechazadas ({solicitudes.filter((s) => s.estado === 'Rechazada').length})</span>
          </button>
        </div>
      </div>

      {/* Requests List */}
      {filteredSolicitudes.length === 0 ? (
        <div className="p-8 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
          <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-60" />
          <h3 className="text-xs font-bold text-zinc-300">No hay solicitudes en esta sección</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Cuando un técnico solicite el retiro de herramientas desde su portal, aparecerán aquí para tu autorización.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSolicitudes.map((sol) => {
            const isPending = sol.estado === 'Pendiente';
            const isApproved = sol.estado === 'Aprobada';
            const isRejected = sol.estado === 'Rechazada';
            const isExpanded = expandedId === sol.id;

            return (
              <div
                key={sol.id || sol.nroSolicitud}
                className={`bg-zinc-900 border rounded-xl p-3 sm:p-3.5 shadow-sm transition-all space-y-2.5 ${
                  isPending 
                    ? 'border-amber-500/50 ring-1 ring-amber-500/20' 
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* 1. Header Line: SKU + Tech info + Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                      {sol.nroSolicitud}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white truncate block">
                        {sol.tecnicoNombre}
                      </span>
                      <span className="text-[10px] text-zinc-400 truncate block">
                        {sol.tecnicoEmail}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 ${
                      isPending
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : isApproved
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : isRejected
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {isPending && <Clock className="w-2.5 h-2.5 animate-pulse" />}
                    {isApproved && <CheckCircle2 className="w-2.5 h-2.5" />}
                    {isRejected && <XCircle className="w-2.5 h-2.5" />}
                    <span>{sol.estado}</span>
                  </span>
                </div>

                {/* 2. Metadata: Date, Motive and GPS */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-zinc-400 pt-1 border-t border-zinc-850">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    {new Date(sol.fechaSolicitud).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>

                  {sol.geoSolicitud && (
                    <span className="flex items-center gap-1 font-mono text-zinc-400">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      GPS: {sol.geoSolicitud.latitude.toFixed(3)}, {sol.geoSolicitud.longitude.toFixed(3)}
                    </span>
                  )}

                  {sol.motivoUso && (
                    <div className="w-full text-zinc-300 italic truncate pt-0.5">
                      <span className="text-zinc-500 not-italic font-bold">Motivo:</span> "{sol.motivoUso}"
                    </div>
                  )}
                </div>

                {/* 3. Items Breakdown List (Compact preview) */}
                <div className="space-y-1.5 pt-1 border-t border-zinc-850">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                    <span>Equipos solicitados ({sol.herramientas.length}):</span>
                    {sol.herramientas.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : sol.id!)}
                        className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>{isExpanded ? 'Ver menos' : `Ver todos (${sol.herramientas.length})`}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {(isExpanded ? sol.herramientas : sol.herramientas.slice(0, 2)).map((h, idx) => {
                      const isGood = h.estadoRetiro === 'Buen estado' || h.estadoRetiro === 'Excelente' || h.estadoRetiro === 'Bueno';
                      const isMaintenance = h.estadoRetiro === 'Falta mantenimiento' || h.estadoRetiro === 'Desgaste normal';

                      return (
                        <div
                          key={h.herramientaId || idx}
                          className="p-1.5 px-2 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 shrink-0">
                              {h.codigo}
                            </span>
                            <span className="text-xs font-bold text-white truncate">
                              {h.nombre}
                            </span>
                            <span className="text-[10px] text-zinc-400 hidden sm:inline truncate">
                              ({h.marca})
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {h.estadoRetiro && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                isGood
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : isMaintenance
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              }`}>
                                {h.estadoRetiro}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {!isExpanded && sol.herramientas.length > 2 && (
                      <p className="text-[10px] text-zinc-500 text-center py-0.5">
                        +{sol.herramientas.length - 2} equipo(s) adicional(es)
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Resolution info if already Approved or Rejected */}
                {isApproved && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      Autorizado por {sol.adminRespuestaNombre || 'Admin'} el {sol.fechaRespuesta ? new Date(sol.fechaRespuesta).toLocaleDateString() : ''}
                    </span>
                  </div>
                )}

                {isRejected && (
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      Rechazado: {sol.motivoRechazo || 'Sin motivo indicado'}
                    </span>
                  </div>
                )}

                {/* 5. Mobile-first Action Buttons: NEVER OVERFLOW! */}
                {isPending && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/90">
                    <button
                      type="button"
                      onClick={() => setSolicitudToAuthorize(sol)}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all shadow flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Autorizar y Entregar ({sol.cantidadTotal})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSolicitudToReject(sol)}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-rose-950/40 border border-zinc-700 hover:border-rose-500/50 text-zinc-300 hover:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 active:scale-95"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Rechazar</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Authorization Modal (Full per-tool inspection & state editing) */}
      {solicitudToAuthorize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden p-4 sm:p-6 space-y-4 my-6">
            <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    Autorizar Entrega de Equipos
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">
                    Solicitud <strong className="text-zinc-200">{solicitudToAuthorize.nroSolicitud}</strong> • Técnico: <strong className="text-amber-400">{solicitudToAuthorize.tecnicoNombre}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSolicitudToAuthorize(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick summary & destination info */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-zinc-300">
                <span>Total de herramientas en esta entrega:</span>
                <strong className="text-amber-400 font-bold">{solicitudToAuthorize.cantidadTotal} unidad(es)</strong>
              </div>
              {solicitudToAuthorize.motivoUso && (
                <div className="text-[11px] text-zinc-400 flex items-start gap-1.5 pt-1 border-t border-zinc-800/80">
                  <span className="text-zinc-500 font-bold shrink-0">Destino / Uso:</span>
                  <span className="text-zinc-300 italic">"{solicitudToAuthorize.motivoUso}"</span>
                </div>
              )}
            </div>

            {/* Bulk condition action bar */}
            <div className="p-3 bg-zinc-950/70 border border-zinc-800/90 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold text-zinc-200">Condición general / Rápida:</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={condicionEntrega}
                  onChange={(e) => {
                    const newCond = e.target.value as CondicionHerramienta;
                    setCondicionEntrega(newCond);
                  }}
                  className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  <option value="Excelente">Excelente (Como nueva)</option>
                  <option value="Bueno">Bueno (Operativa al 100%)</option>
                  <option value="Desgaste normal">Desgaste normal (Con marcas de uso)</option>
                  <option value="Falta mantenimiento">Falta mantenimiento (Revisión)</option>
                  <option value="Dañada / Requiere servicio">Dañada / Requiere servicio</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleApplyConditionToAll(condicionEntrega)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold transition-all border border-zinc-700 shrink-0"
                  title="Asigna este estado a todas las herramientas de la lista"
                >
                  Aplicar a todas
                </button>
              </div>
            </div>

            {/* Individual Tool Inspection and Condition Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                <span>Revisión individual del estado de cada herramienta:</span>
                <span className="text-[11px] text-zinc-500 font-normal">
                  (Cada equipo puede tener su propio estado y notas)
                </span>
              </div>

              <div className="max-h-[38vh] sm:max-h-[44vh] overflow-y-auto space-y-2.5 pr-1 divide-y divide-zinc-800/40">
                {solicitudToAuthorize.herramientas.map((item, index) => {
                  const currentToolState = perToolConditions[item.herramientaId] || {
                    condicion: (item.estadoRetiro as CondicionHerramienta) || 'Bueno',
                    observaciones: item.observacionesRetiro || '',
                  };

                  return (
                    <div 
                      key={item.herramientaId || index}
                      className="pt-2.5 first:pt-0 bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 space-y-2.5 hover:border-zinc-700/80 transition-all"
                    >
                      {/* Tool header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 text-amber-400 flex items-center justify-center shrink-0">
                            <Wrench className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">
                              {item.nombre}
                            </h4>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {item.marca} {item.modelo ? `• ${item.modelo}` : ''} • {item.categoria}
                            </p>
                          </div>
                        </div>

                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-amber-400 font-bold shrink-0">
                          {item.codigo}
                        </span>
                      </div>

                      {/* Technician request notes (if any) */}
                      {item.observacionesRetiro && (
                        <div className="text-[10px] text-zinc-400 bg-zinc-900/90 px-2 py-1 rounded border border-zinc-800 flex items-start gap-1">
                          <span className="text-zinc-500 font-semibold shrink-0">Nota técnico:</span>
                          <span className="text-zinc-300 italic">{item.observacionesRetiro}</span>
                        </div>
                      )}

                      {/* Individual State & Note inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                            Estado de esta herramienta *
                          </label>
                          <select
                            value={currentToolState.condicion}
                            onChange={(e) =>
                              handleUpdateToolCondition(
                                item.herramientaId,
                                e.target.value as CondicionHerramienta
                              )
                            }
                            className={`w-full px-2.5 py-1.5 bg-zinc-900 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors ${
                              currentToolState.condicion === 'Excelente'
                                ? 'border-emerald-500/50 text-emerald-300'
                                : currentToolState.condicion === 'Bueno'
                                ? 'border-zinc-700 text-zinc-100'
                                : currentToolState.condicion === 'Desgaste normal'
                                ? 'border-amber-500/50 text-amber-300'
                                : 'border-rose-500/50 text-rose-300'
                            }`}
                          >
                            <option value="Excelente">Excelente (Como nueva)</option>
                            <option value="Bueno">Bueno (Operativa al 100%)</option>
                            <option value="Desgaste normal">Desgaste normal (Marcas de uso)</option>
                            <option value="Falta mantenimiento">Falta mantenimiento (Revisión)</option>
                            <option value="Dañada / Requiere servicio">Dañada / Requiere servicio</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                            Observación / Detalle de este equipo
                          </label>
                          <input
                            type="text"
                            value={currentToolState.observaciones}
                            onChange={(e) =>
                              handleUpdateToolObs(item.herramientaId, e.target.value)
                            }
                            placeholder="Ej: Carcasa rayada, con batería extra..."
                            className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* General delivery note (optional) */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Observaciones generales de la entrega (Opcional)
              </label>
              <input
                type="text"
                value={observacionesEntrega}
                onChange={(e) => setObservacionesEntrega(e.target.value)}
                placeholder="Ej: Entregado en mostrador principal con candado..."
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Mandatory GPS Notice for Admin */}
            <GpsRequirementNotice
              gps={adminGps}
              loading={loadingAdminGps}
              onGpsAcquired={setAdminGps}
              actionName="autorizar y entregar las herramientas"
            />

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSolicitudToAuthorize(null)}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAuthorize}
                disabled={isAuthorizing || !adminGps || loadingAdminGps}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all shadow flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAuthorizing ? (
                  <span>Registrando...</span>
                ) : !adminGps ? (
                  <span>Activar GPS para Autorizar</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Confirmar y Entregar ({solicitudToAuthorize.cantidadTotal})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal (Ultra-compact) */}
      {solicitudToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                  <X className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-white truncate">
                    Rechazar Solicitud de Retiro
                  </h3>
                  <p className="text-[10px] text-zinc-400 truncate">
                    Solicitud {solicitudToReject.nroSolicitud} de {solicitudToReject.tecnicoNombre}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSolicitudToReject(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Motivo del Rechazo *
              </label>
              <textarea
                rows={2}
                required
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Indica la razón (ej: falta de stock, mantenimiento preventivo)..."
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSolicitudToReject(null)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting || !motivoRechazo.trim()}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition-all shadow disabled:opacity-50"
              >
                {isRejecting ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
