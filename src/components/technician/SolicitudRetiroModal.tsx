import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Clock, 
  FileText, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Package, 
  Sparkles, 
  Calendar, 
  Layers, 
  Plus, 
  Search, 
  Check, 
  Wrench, 
  ChevronDown, 
  ChevronUp,
  Tag,
  Info,
  MapPin,
  Eye,
  ArrowLeft,
  Edit3,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { Herramienta, HerramientaSolicitada, CondicionHerramienta, GeoLocationPoint } from '../../types';
import { createSolicitudRetiro, autorizarSolicitudRetiro } from '../../services/toolService';
import { captureCurrentLocation, getGoogleMapsUrl } from '../../services/geoService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ToolConditionPopUp } from './ToolConditionPopUp';
import { GpsRequirementNotice } from '../common/GpsRequirementNotice';

interface SolicitudRetiroModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Herramienta[];
  allTools?: Herramienta[];
  onAddToCart: (tool: Herramienta) => void;
  onRemoveFromCart: (toolId: string) => void;
  onClearCart: () => void;
  onSuccessSubmit: () => void;
  savedToolConditions?: Record<string, ToolWithdrawalState>;
  onUpdateCondition?: (toolId: string, condition: CondicionHerramienta, observations: string) => void;
}

interface ToolWithdrawalState {
  estadoRetiro: CondicionHerramienta;
  observacionesRetiro: string;
}

export const SolicitudRetiroModal: React.FC<SolicitudRetiroModalProps> = ({
  isOpen,
  onClose,
  cart,
  allTools = [],
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
  onSuccessSubmit,
  savedToolConditions = {},
  onUpdateCondition,
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [autoAuthorizeAsAdmin, setAutoAuthorizeAsAdmin] = useState(true);

  // Mode: 'edit' (building the request) | 'preview' (full preview before withdrawing)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  // State map per tool ID for condition & observations upon withdrawal
  const [toolConditions, setToolConditions] = useState<Record<string, ToolWithdrawalState>>(savedToolConditions);

  // Tool currently being configured in the Condition PopUp
  const [toolForConditionPopUp, setToolForConditionPopUp] = useState<Herramienta | null>(null);

  // Whether the "Add more tools" picker drawer/section is open
  const [isToolPickerOpen, setIsToolPickerOpen] = useState<boolean>(cart.length === 0);

  // Search & category filter inside picker
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // GPS State
  const [gpsLocation, setGpsLocation] = useState<GeoLocationPoint | null>(null);
  const [loadingGps, setLoadingGps] = useState<boolean>(false);

  const [motivoUso, setMotivoUso] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Synchronize tool conditions when cart changes
  useEffect(() => {
    setToolConditions((prev) => {
      const updated = { ...prev };
      cart.forEach((t) => {
        if (!updated[t.id!]) {
          updated[t.id!] = {
            estadoRetiro: 'Buen estado',
            observacionesRetiro: '',
          };
        }
      });
      return updated;
    });

    if (cart.length === 0) {
      setIsToolPickerOpen(true);
      setViewMode('edit');
    }
  }, [cart]);

  // Capture GPS on open
  useEffect(() => {
    if (isOpen) {
      setLoadingGps(true);
      captureCurrentLocation()
        .then((loc) => {
          setGpsLocation(loc);
        })
        .finally(() => {
          setLoadingGps(false);
        });
    } else {
      setViewMode('edit');
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Filter available tools for the quick picker
  const categories = useMemo(() => {
    return Array.from(new Set(allTools.map((h) => h.categoria))).filter(Boolean);
  }, [allTools]);

  const availableTools = useMemo(() => {
    return allTools.filter((t) => t.estado === 'Disponible');
  }, [allTools]);

  const filteredPickerTools = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return availableTools.filter((tool) => {
      const matchesSearch =
        !term ||
        tool.nombre.toLowerCase().includes(term) ||
        tool.codigo.toLowerCase().includes(term) ||
        tool.marca.toLowerCase().includes(term) ||
        (tool.modelo && tool.modelo.toLowerCase().includes(term));
      const matchesCategory = selectedCategory === 'all' || tool.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [availableTools, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  // When clicking "+ Agregar" on a tool, open the requested condition pop-up!
  const handleRequestAddToolWithCondition = (tool: Herramienta) => {
    const isAlreadyInCart = cart.some((item) => item.id === tool.id);
    if (isAlreadyInCart) {
      // Allow modifying condition
      setToolForConditionPopUp(tool);
    } else {
      // Open Pop-Up to set condition before adding
      setToolForConditionPopUp(tool);
    }
  };

  // Called when the user confirms the condition in the Pop-Up
  const handleConfirmConditionPopUp = (
    tool: Herramienta,
    condition: CondicionHerramienta,
    observations: string
  ) => {
    const isAlreadyInCart = cart.some((item) => item.id === tool.id);
    if (!isAlreadyInCart) {
      onAddToCart(tool);
    }

    setToolConditions((prev) => ({
      ...prev,
      [tool.id!]: {
        estadoRetiro: condition,
        observacionesRetiro: observations,
      },
    }));

    onUpdateCondition?.(tool.id!, condition, observations);

    showToast(
      'success',
      'Equipo registrado',
      `${tool.nombre} cargada en estado: "${condition}".`
    );
  };

  // Validate and switch to preview mode
  const handleGoToPreview = () => {
    if (cart.length === 0) {
      setErrorMsg('Debes agregar al menos una herramienta a la lista.');
      setIsToolPickerOpen(true);
      return;
    }

    setErrorMsg(null);
    setViewMode('preview');
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    if (cart.length === 0) {
      setErrorMsg('No hay herramientas seleccionadas.');
      setViewMode('edit');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      let finalGps = gpsLocation;
      if (!finalGps) {
        setLoadingGps(true);
        finalGps = await captureCurrentLocation();
        setLoadingGps(false);
        if (finalGps) {
          setGpsLocation(finalGps);
        }
      }

      if (!finalGps) {
        setErrorMsg('Ubicación GPS obligatoria: Debes activar la ubicación del teléfono para poder solicitar el retiro de herramientas.');
        showToast('error', 'GPS Requerido', 'Debes encender la ubicación de tu teléfono para enviar la solicitud.');
        setSubmitting(false);
        return;
      }

      const tecnicoNombre = userProfile?.nombre || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Técnico';
      const tecnicoEmail = userProfile?.email || currentUser?.email || '';

      const herramientasSolicitadas: HerramientaSolicitada[] = cart.map((tool) => {
        const state = toolConditions[tool.id!] || { estadoRetiro: 'Buen estado', observacionesRetiro: '' };
        return {
          herramientaId: tool.id!,
          codigo: tool.codigo,
          nombre: tool.nombre,
          marca: tool.marca,
          modelo: tool.modelo,
          categoria: tool.categoria,
          ubicacion: tool.ubicacion,
          fotoUrl: tool.fotoUrl,
          estadoRetiro: state.estadoRetiro,
          observacionesRetiro: state.observacionesRetiro?.trim() || '',
        };
      });

      const newSolicitudId = await createSolicitudRetiro({
        tecnicoUid: currentUser?.uid || '',
        tecnicoNombre,
        tecnicoEmail,
        herramientas: herramientasSolicitadas,
        motivoUso: motivoUso.trim(),
        geoSolicitud: finalGps,
      });

      if (isAdmin && autoAuthorizeAsAdmin && newSolicitudId) {
        const fullSolicitud = {
          id: newSolicitudId,
          nroSolicitud: `SOL-${Math.floor(1000 + Math.random() * 9000)}`,
          tecnicoUid: currentUser?.uid || '',
          tecnicoNombre,
          tecnicoEmail,
          herramientas: herramientasSolicitadas,
          cantidadTotal: herramientasSolicitadas.length,
          fechaSolicitud: new Date().toISOString(),
          motivoUso: motivoUso.trim(),
          estado: 'Pendiente' as const,
          ...(finalGps ? { geoSolicitud: finalGps } : {}),
        };

        await autorizarSolicitudRetiro(
          fullSolicitud,
          currentUser?.uid || '',
          tecnicoNombre,
          'Retiro directo por Administrador',
          'Bueno',
          finalGps
        );

        showToast(
          'success',
          '¡Retiro completado!',
          `Se registraron ${cart.length} herramienta(s) directamente en tu posesión con GPS.`
        );
      } else {
        showToast(
          'success',
          '¡Solicitud enviada con éxito!',
          `Se solicitó el retiro de ${cart.length} herramienta(s) con registro de estado y GPS. Esperando autorización.`
        );
      }

      onClearCart();
      onSuccessSubmit();
      onClose();
    } catch (err: any) {
      console.error('Error submitting solicitud:', err);
      setErrorMsg('No se pudo enviar la solicitud. Por favor intenta nuevamente.');
      showToast('error', 'Error al enviar solicitud', 'Revisa tu conexión o permisos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
        <div 
          className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl w-full max-w-xl h-[92vh] sm:h-[88vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===================================================================== */}
          {/* 1. MODAL HEADER - ULTRA COMPACT (NO WASTED SPACE)                     */}
          {/* ===================================================================== */}
          <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/90 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black shrink-0">
                {viewMode === 'preview' ? <Eye className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
                    {viewMode === 'preview' ? 'Vista Previa de la Solicitud' : 'Solicitud de Retiro'}
                  </h3>
                  {cart.length > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-black shrink-0">
                      {cart.length} {cart.length === 1 ? 'equipo' : 'equipos'}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 truncate">
                  {viewMode === 'preview'
                    ? 'Verifica los datos y estado reportado antes de enviar'
                    : 'Selecciona equipos y estado físico al retirar'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
              aria-label="Cerrar ventana"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* ===================================================================== */}
          {/* 2. MODAL BODY (MAXIMIZED SCROLLABLE CENTRAL REGION)                   */}
          {/* ===================================================================== */}
          <div className="p-3 sm:p-4 overflow-y-auto space-y-3.5 flex-1 min-h-0">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ================================================================= */}
            {/* VIEW MODE 1: EDIT / CONFIGURATION                                 */}
            {/* ================================================================= */}
            {viewMode === 'edit' && (
              <>
                {/* SECTION 1: EQUIPOS A RETIRAR */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-200">
                        Equipos Seleccionados ({cart.length})
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsToolPickerOpen(!isToolPickerOpen)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[11px] font-bold transition-all flex items-center gap-1 border border-zinc-700"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isToolPickerOpen ? 'Cerrar catálogo' : '+ Agregar equipos'}</span>
                        {isToolPickerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {cart.length > 0 && (
                        <button
                          type="button"
                          onClick={onClearCart}
                          className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors px-1"
                        >
                          Vaciar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* QUICK TOOL PICKER DRAWER / SEARCH */}
                  {isToolPickerOpen && (
                    <div className="mb-3 p-3 rounded-2xl bg-zinc-950 border border-amber-500/30 space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                          <Search className="w-3 h-3" />
                          Seleccionar herramientas disponibles
                        </h5>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {availableTools.length} disponibles
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por código, nombre o marca..."
                            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        {categories.length > 0 && (
                          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setSelectedCategory('all')}
                              className={`px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                                selectedCategory === 'all'
                                  ? 'bg-amber-500 text-black font-bold'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
                              }`}
                            >
                              Todas ({availableTools.length})
                            </button>
                            {categories.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setSelectedCategory(c)}
                                className={`px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                                  selectedCategory === c
                                    ? 'bg-amber-500 text-black font-bold'
                                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tool Picker List */}
                      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                        {filteredPickerTools.length === 0 ? (
                          <p className="text-[11px] text-zinc-500 text-center py-3">
                            No hay herramientas disponibles coincidentes.
                          </p>
                        ) : (
                          filteredPickerTools.map((tool) => {
                            const isInCart = cart.some((c) => c.id === tool.id);
                            return (
                              <div
                                key={tool.id}
                                className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                                  isInCart
                                    ? 'bg-amber-500/10 border-amber-500/40'
                                    : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-[9px] font-bold text-amber-400 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800 shrink-0">
                                    {tool.codigo}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{tool.nombre}</p>
                                    <p className="text-[10px] text-zinc-400 truncate">
                                      {tool.marca} • {tool.categoria}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRequestAddToolWithCondition(tool)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all ${
                                    isInCart
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-sm'
                                  }`}
                                >
                                  {isInCart ? (
                                    <>
                                      <Edit3 className="w-3 h-3" />
                                      <span>Estado</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      <span>+ Agregar</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* CART ITEMS LIST */}
                  {cart.length === 0 ? (
                    <div className="p-6 text-center bg-zinc-950/60 rounded-2xl border border-dashed border-zinc-800 text-zinc-400 space-y-1.5">
                      <Package className="w-8 h-8 mx-auto text-zinc-600 opacity-60" />
                      <h5 className="text-xs font-bold text-zinc-300">Aún no has agregado herramientas</h5>
                      <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                        Toca "+ Agregar equipos" para elegir del catálogo y definir el estado de cada uno.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsToolPickerOpen(true)}
                        className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Abrir Catálogo</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((tool, index) => {
                        const state = toolConditions[tool.id!] || {
                          estadoRetiro: 'Buen estado',
                          observacionesRetiro: '',
                        };

                        const isGood = state.estadoRetiro === 'Buen estado' || state.estadoRetiro === 'Excelente' || state.estadoRetiro === 'Bueno';
                        const isMaintenance = state.estadoRetiro === 'Falta mantenimiento' || state.estadoRetiro === 'Desgaste normal';

                        return (
                          <div
                            key={tool.id || tool.codigo}
                            className="p-2.5 sm:p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1.5 shadow-sm hover:border-zinc-700 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[9px] font-bold text-zinc-400 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800 shrink-0">
                                  #{index + 1}
                                </span>
                                <span className="font-mono text-xs font-bold text-amber-400 shrink-0">
                                  {tool.codigo}
                                </span>
                                <span className="text-xs font-bold text-white truncate">
                                  {tool.nombre}
                                </span>
                                <span className="text-[10px] text-zinc-400 hidden sm:inline truncate">
                                  ({tool.marca})
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                                    isGood
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                      : isMaintenance
                                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  }`}
                                >
                                  {isGood && <CheckCircle2 className="w-2.5 h-2.5" />}
                                  {isMaintenance && <AlertTriangle className="w-2.5 h-2.5" />}
                                  {!isGood && !isMaintenance && <XCircle className="w-2.5 h-2.5" />}
                                  <span>{state.estadoRetiro}</span>
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleRequestAddToolWithCondition(tool)}
                                  className="p-1 text-zinc-400 hover:text-amber-400 rounded-lg hover:bg-zinc-800 transition-colors"
                                  title="Editar estado y notas"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onRemoveFromCart(tool.id!)}
                                  className="p-1 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                                  title="Quitar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {state.observacionesRetiro && (
                              <p className="text-[10px] text-zinc-400 italic bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-850 truncate">
                                Obs: "{state.observacionesRetiro}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SECTION 2: DATOS DEL RETIRO */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                  {/* Motive */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-amber-400" />
                      Motivo / Tarea a realizar (Opcional):
                    </label>
                    <input
                      type="text"
                      value={motivoUso}
                      onChange={(e) => setMotivoUso(e.target.value)}
                      placeholder="Ej: Mantenimiento línea 2, instalación de cableado..."
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ================================================================= */}
            {/* VIEW MODE 2: VISTA PREVIA ULTRA COMPACTA (MAXIMIZED CENTRAL LIST) */}
            {/* ================================================================= */}
            {viewMode === 'preview' && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                {/* Compact Metadata Strip */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <span className="text-zinc-500">Técnico:</span>
                    <strong className="text-white font-bold">
                      {userProfile?.nombre || currentUser?.displayName || 'Técnico'}
                    </strong>
                  </div>

                  {motivoUso && (
                    <div className="w-full pt-1 border-t border-zinc-900 text-zinc-400 text-[10px] truncate">
                      <span className="text-zinc-500 font-bold">Motivo:</span> "{motivoUso}"
                    </div>
                  )}
                </div>

                {/* GPS Requirement Notice Banner */}
                <GpsRequirementNotice
                  gps={gpsLocation}
                  loading={loadingGps}
                  onGpsAcquired={setGpsLocation}
                  actionName="solicitar el retiro de herramientas"
                />

                {/* Central Tools List (Dominates screen real estate!) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pb-0.5">
                    <h5 className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-400" />
                      <span>Equipos y Estado Físico Declarado ({cart.length})</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setViewMode('edit')}
                      className="text-amber-400 hover:underline text-[10px] font-bold flex items-center gap-1"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>Modificar</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {cart.map((tool, idx) => {
                      const state = toolConditions[tool.id!] || {
                        estadoRetiro: 'Buen estado',
                        observacionesRetiro: '',
                      };

                      const isGood = state.estadoRetiro === 'Buen estado' || state.estadoRetiro === 'Excelente' || state.estadoRetiro === 'Bueno';
                      const isMaintenance = state.estadoRetiro === 'Falta mantenimiento' || state.estadoRetiro === 'Desgaste normal';

                      return (
                        <div
                          key={tool.id || idx}
                          className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0">
                                {tool.codigo}
                              </span>
                              <strong className="text-xs font-bold text-white truncate">
                                {tool.nombre}
                              </strong>
                              <span className="text-zinc-400 text-[10px] hidden sm:inline truncate">
                                ({tool.marca})
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 shrink-0 ${
                                isGood
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : isMaintenance
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {isGood && <CheckCircle2 className="w-2.5 h-2.5" />}
                              {isMaintenance && <AlertTriangle className="w-2.5 h-2.5" />}
                              {!isGood && !isMaintenance && <XCircle className="w-2.5 h-2.5" />}
                              <span>{state.estadoRetiro}</span>
                            </span>
                          </div>

                          {state.observacionesRetiro ? (
                            <p className="text-[10px] text-zinc-300 italic bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-850 truncate">
                              Obs: "{state.observacionesRetiro}"
                            </p>
                          ) : (
                            <p className="text-[9px] text-zinc-600 italic">
                              Sin observaciones adicionales.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Footer Auto-Authorize switch for Admin */}
          {viewMode === 'preview' && isAdmin && (
            <div className="px-3.5 py-2 bg-amber-500/10 border-t border-amber-500/20 flex items-center justify-between gap-2 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-amber-200">
                <input
                  type="checkbox"
                  checked={autoAuthorizeAsAdmin}
                  onChange={(e) => setAutoAuthorizeAsAdmin(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="font-semibold">Auto-autorizar retiro inmediato</span>
                <span className="text-[10px] text-amber-300/80 hidden sm:inline">(quedan en tu posesión al instante)</span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                Modo Admin
              </span>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 3. MODAL FOOTER - SLEEK & COMPACT SINGLE ROW                          */}
          {/* ===================================================================== */}
          <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-t border-zinc-800 bg-zinc-950/95 flex items-center justify-between gap-2 shrink-0">
            <div className="text-[11px] text-zinc-400 flex items-center gap-1">
              <span>Total:</span>
              <strong className="text-white font-mono font-black">{cart.length}</strong>
            </div>

            <div className="flex items-center gap-2">
              {viewMode === 'edit' ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToPreview}
                    disabled={cart.length === 0}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-40 active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Vista Previa ({cart.length})</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className="px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Volver</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={submitting || cart.length === 0 || !gpsLocation || loadingGps}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black text-xs font-black transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  >
                    {submitting ? (
                      <span>Enviando...</span>
                    ) : !gpsLocation ? (
                      <>
                        <MapPin className="w-3.5 h-3.5 text-black" />
                        <span>Activar GPS para Enviar</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Confirmar y Enviar ({cart.length})</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TOOL CONDITION POP-UP (when adding or editing an item's condition) */}
      <ToolConditionPopUp
        isOpen={!!toolForConditionPopUp}
        onClose={() => setToolForConditionPopUp(null)}
        tool={toolForConditionPopUp}
        initialCondition={toolForConditionPopUp ? toolConditions[toolForConditionPopUp.id!]?.estadoRetiro : 'Buen estado'}
        initialObservations={toolForConditionPopUp ? toolConditions[toolForConditionPopUp.id!]?.observacionesRetiro : ''}
        onConfirm={handleConfirmConditionPopUp}
      />
    </>
  );
};
