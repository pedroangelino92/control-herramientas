import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  Wrench, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  UserPlus, 
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';
import { Herramienta, Usuario, CondicionHerramienta, GeoLocationPoint } from '../../types';
import { registerMultiplePrestamos, ToolLoanItem } from '../../services/toolService';
import { captureCurrentLocation } from '../../services/geoService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { GpsRequirementNotice } from '../common/GpsRequirementNotice';

interface NewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  herramientas: Herramienta[];
  usuarios: Usuario[];
  preSelectedTool?: Herramienta | null;
  onLoanCompleted?: () => void;
}

interface LoanToolEntry {
  tool: Herramienta;
  condicion: CondicionHerramienta;
  observaciones: string;
}

export const NewLoanModal: React.FC<NewLoanModalProps> = ({
  isOpen,
  onClose,
  herramientas,
  usuarios,
  preSelectedTool,
  onLoanCompleted,
}) => {
  const { userProfile, currentUser } = useAuth();
  const { showToast } = useToast();

  // Multi-tool list state where each tool has its individual condition and notes
  const [loanTools, setLoanTools] = useState<LoanToolEntry[]>([]);
  const [toolToAddId, setToolToAddId] = useState<string>('');

  // Bulk condition shortcut
  const [bulkCondition, setBulkCondition] = useState<CondicionHerramienta>('Bueno');
  
  // External recipient states
  const [recipientType, setRecipientType] = useState<'external_colleague' | 'registered_user'>('external_colleague');
  const [externalName, setExternalName] = useState<string>('');
  const [externalDept, setExternalDept] = useState<string>('');
  const [externalContact, setExternalContact] = useState<string>('');
  const [selectedTecnicoUid, setSelectedTecnicoUid] = useState<string>('');

  const [fechaEstimada, setFechaEstimada] = useState<string>('');
  const [generalObservaciones, setGeneralObservaciones] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [adminGps, setAdminGps] = useState<GeoLocationPoint | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);

  // Available tools
  const availableTools = herramientas.filter(
    (h) => h.estado === 'Disponible' || (preSelectedTool && h.id === preSelectedTool.id)
  );

  // Unselected available tools
  const unselectedAvailableTools = availableTools.filter(
    (at) => !loanTools.some((lt) => lt.tool.id === at.id)
  );

  // Active technicians / users
  const activeTechnicians = usuarios.filter((u) => u.estado === 'activo');

  // Initialize GPS and tools when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingGps(true);
      captureCurrentLocation()
        .then((loc) => setAdminGps(loc))
        .finally(() => setLoadingGps(false));

      if (preSelectedTool && preSelectedTool.id) {
        setLoanTools([{ tool: preSelectedTool, condicion: 'Bueno', observaciones: '' }]);
      } else if (availableTools.length > 0) {
        setLoanTools([{ tool: availableTools[0], condicion: 'Bueno', observaciones: '' }]);
      }

      if (activeTechnicians.length > 0 && !selectedTecnicoUid) {
        setSelectedTecnicoUid(activeTechnicians[0].uid);
      }

      // Default return date: 3 days from now
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + 3);
      returnDate.setHours(18, 0, 0, 0);
      setFechaEstimada(returnDate.toISOString().slice(0, 16));
    } else {
      setAdminGps(null);
      setLoanTools([]);
    }
  }, [isOpen, preSelectedTool]);

  if (!isOpen) return null;

  const currentSelectedTecnico = activeTechnicians.find((u) => u.uid === selectedTecnicoUid);

  // Add a tool to the loan list
  const handleAddTool = () => {
    if (!toolToAddId) return;
    const toolObj = availableTools.find((t) => t.id === toolToAddId);
    if (!toolObj) return;

    setLoanTools((prev) => [
      ...prev,
      {
        tool: toolObj,
        condicion: bulkCondition || 'Bueno',
        observaciones: '',
      },
    ]);
    setToolToAddId('');
  };

  // Remove a tool from loan list
  const handleRemoveTool = (toolId: string) => {
    setLoanTools((prev) => prev.filter((item) => item.tool.id !== toolId));
  };

  // Update condition of a specific tool
  const handleUpdateToolCondition = (toolId: string, cond: CondicionHerramienta) => {
    setLoanTools((prev) =>
      prev.map((item) =>
        item.tool.id === toolId ? { ...item, condicion: cond } : item
      )
    );
  };

  // Update notes of a specific tool
  const handleUpdateToolNotes = (toolId: string, notes: string) => {
    setLoanTools((prev) =>
      prev.map((item) =>
        item.tool.id === toolId ? { ...item, observaciones: notes } : item
      )
    );
  };

  // Bulk apply condition to all tools in list
  const handleApplyBulkCondition = () => {
    setLoanTools((prev) =>
      prev.map((item) => ({
        ...item,
        condicion: bulkCondition,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loanTools.length === 0) {
      showToast('warning', 'Selecciona al menos una herramienta', 'Debes elegir herramientas disponibles para prestar.');
      return;
    }

    let targetTecnico: Usuario | null = null;

    if (recipientType === 'external_colleague') {
      if (!externalName.trim()) {
        showToast('warning', 'Nombre requerido', 'Por favor ingresa el nombre de la persona que recibe la herramienta.');
        return;
      }
      if (!externalDept.trim()) {
        showToast('warning', 'Departamento requerido', 'Indica el departamento o área de la empresa al que pertenece la persona.');
        return;
      }

      targetTecnico = {
        uid: `ext_${Date.now()}`,
        nombre: `${externalName.trim()} (${externalDept.trim()})`,
        email: externalContact.trim() || 'externo@empresa.local',
        rol: 'tecnico',
        estado: 'activo',
      };
    } else {
      if (!currentSelectedTecnico) {
        showToast('warning', 'Selecciona un usuario', 'Debes elegir a un usuario de la lista.');
        return;
      }
      targetTecnico = currentSelectedTecnico;
    }

    let finalGps = adminGps;
    if (!finalGps) {
      setLoadingGps(true);
      finalGps = await captureCurrentLocation();
      setLoadingGps(false);
      if (finalGps) setAdminGps(finalGps);
    }

    if (!finalGps) {
      showToast('error', 'GPS Obligatorio', 'Debes tener la ubicación encendida para registrar el préstamo de herramientas.');
      return;
    }

    setLoading(true);
    try {
      const itemsToLoan: ToolLoanItem[] = loanTools.map((lt) => {
        let combinedObs = '';
        if (recipientType === 'external_colleague') {
          combinedObs += `[Externo: ${externalDept.trim()}${externalContact.trim() ? ` | Tel: ${externalContact.trim()}` : ''}] `;
        }
        if (lt.observaciones.trim()) {
          combinedObs += `[Estado: ${lt.condicion}] ${lt.observaciones.trim()} `;
        }
        if (generalObservaciones.trim()) {
          combinedObs += `[General: ${generalObservaciones.trim()}] `;
        }

        return {
          herramienta: lt.tool,
          condicionEntrega: lt.condicion,
          observacionesEntrega: combinedObs.trim() || `Préstamo a ${targetTecnico.nombre}`,
        };
      });

      await registerMultiplePrestamos({
        items: itemsToLoan,
        tecnico: targetTecnico,
        adminNombre: userProfile?.nombre || currentUser?.displayName || currentUser?.email || 'Administrador',
        adminUid: currentUser?.uid || 'admin',
        fechaEstimadaDevolucion: new Date(fechaEstimada).toISOString(),
        geoEntrega: finalGps,
      });

      showToast(
        'success',
        'Préstamo Registrado',
        `Se prestaron ${loanTools.length} herramienta(s) a ${targetTecnico.nombre} con estado individual registrado.`
      );

      // Reset form
      setExternalName('');
      setExternalDept('');
      setExternalContact('');
      setGeneralObservaciones('');
      setLoanTools([]);

      if (onLoanCompleted) onLoanCompleted();
      onClose();
    } catch (err: any) {
      showToast('error', 'Error al registrar préstamo', err.message || 'Error en la operación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-2xl text-zinc-100 my-6"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Prestar a Usuario Externo</h3>
            <p className="text-xs text-zinc-400">
              Personal de la empresa que no pertenece a nuestro departamento
            </p>
          </div>
        </div>

        {availableTools.length === 0 ? (
          <div className="p-6 bg-zinc-950 rounded-xl border border-zinc-800 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-sm font-semibold text-zinc-200">No hay herramientas disponibles en almacén</p>
            <p className="text-xs text-zinc-400">
              Todas las herramientas registradas se encuentran prestadas o en mantenimiento.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Recipient Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Datos del Colaborador que Recibe *
                </label>
                <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setRecipientType('external_colleague')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      recipientType === 'external_colleague'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Otro Departamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('registered_user')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      recipientType === 'registered_user'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Usuario del Sistema
                  </button>
                </div>
              </div>

              {recipientType === 'external_colleague' ? (
                <div className="space-y-3 p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Nombre completo de la persona *
                    </label>
                    <input
                      type="text"
                      required
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      placeholder="Ej: Ing. Carlos Soto / Juan Pérez"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-zinc-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" />
                        Departamento / Área de la empresa *
                      </label>
                      <input
                        type="text"
                        required
                        value={externalDept}
                        onChange={(e) => setExternalDept(e.target.value)}
                        placeholder="Ej: Mantenimiento Planta, TI..."
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Teléfono / Extensión o Correo
                      </label>
                      <input
                        type="text"
                        value={externalContact}
                        onChange={(e) => setExternalContact(e.target.value)}
                        placeholder="Ej: Ext. 4022 / csoto@empresa.com"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2">
                  <select
                    value={selectedTecnicoUid}
                    onChange={(e) => setSelectedTecnicoUid(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {activeTechnicians.map((tech) => (
                      <option key={tech.uid} value={tech.uid}>
                        {tech.nombre} ({tech.email}) • {tech.rol === 'admin' ? 'Administrador' : 'Técnico'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-zinc-400">
                    Solo selecciona un usuario si esa persona de otro departamento ya cuenta con registro en el sistema.
                  </p>
                </div>
              )}
            </div>

            {/* Tool Selection & Individual Status Section */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-200">
                  Herramientas a Entregar ({loanTools.length}) *
                </label>
                {loanTools.length > 1 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <select
                      value={bulkCondition}
                      onChange={(e) => setBulkCondition(e.target.value as CondicionHerramienta)}
                      className="px-2 py-0.5 bg-zinc-950 border border-zinc-700 rounded text-zinc-200 text-[11px]"
                    >
                      <option value="Excelente">Excelente</option>
                      <option value="Bueno">Bueno</option>
                      <option value="Desgaste normal">Desgaste normal</option>
                      <option value="Falta mantenimiento">Falta mantenimiento</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleApplyBulkCondition}
                      className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-[11px] font-medium border border-zinc-700"
                    >
                      Aplicar a todas
                    </button>
                  </div>
                )}
              </div>

              {/* Add tool row */}
              {unselectedAvailableTools.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-zinc-950/70 border border-zinc-800 rounded-xl">
                  <select
                    value={toolToAddId}
                    onChange={(e) => setToolToAddId(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  >
                    <option value="">-- Seleccionar herramienta disponible para agregar --</option>
                    {unselectedAvailableTools.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{t.codigo}] {t.nombre} - {t.marca} ({t.ubicacion || 'Almacén'})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddTool}
                    disabled={!toolToAddId}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-bold rounded-lg transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </button>
                </div>
              )}

              {/* List of tools in loan with individual condition & notes */}
              <div className="max-h-[34vh] overflow-y-auto space-y-2.5 pr-1">
                {loanTools.map((item, idx) => (
                  <div 
                    key={item.tool.id || idx}
                    className="p-3 bg-zinc-950/90 border border-zinc-800 rounded-xl space-y-2.5"
                  >
                    {/* Tool header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-400 flex items-center justify-center shrink-0">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.tool.nombre}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{item.tool.marca} • Ubicación: {item.tool.ubicacion || 'Almacén'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-amber-400 font-bold">
                          {item.tool.codigo}
                        </span>
                        {loanTools.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTool(item.tool.id!)}
                            className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                            title="Quitar herramienta de este préstamo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Individual Condition & Observation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                          Estado de esta herramienta *
                        </label>
                        <select
                          value={item.condicion}
                          onChange={(e) =>
                            handleUpdateToolCondition(
                              item.tool.id!,
                              e.target.value as CondicionHerramienta
                            )
                          }
                          className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                        >
                          <option value="Excelente">Excelente (Como nueva)</option>
                          <option value="Bueno">Bueno (En perfecto estado)</option>
                          <option value="Desgaste normal">Desgaste normal (Con marcas de uso)</option>
                          <option value="Falta mantenimiento">Falta mantenimiento (Revisión)</option>
                          <option value="Dañada / Requiere servicio">Dañada / Requiere servicio</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                          Observación de este equipo (opcional)
                        </label>
                        <input
                          type="text"
                          value={item.observaciones}
                          onChange={(e) =>
                            handleUpdateToolNotes(item.tool.id!, e.target.value)
                          }
                          placeholder="Ej: En estuche, con cargador..."
                          className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Return Date */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Fecha Estimada de Devolución *
              </label>
              <input
                type="datetime-local"
                required
                value={fechaEstimada}
                onChange={(e) => setFechaEstimada(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* General observations */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Observaciones generales del préstamo (Opcional)
              </label>
              <textarea
                rows={2}
                value={generalObservaciones}
                onChange={(e) => setGeneralObservaciones(e.target.value)}
                placeholder="Ej: Préstamo autorizado para labores de mantenimiento en planta 2..."
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              />
            </div>

            {/* Mandatory GPS notice for loan */}
            <GpsRequirementNotice
              gps={adminGps}
              loading={loadingGps}
              onGpsAcquired={setAdminGps}
              actionName="registrar la entrega y préstamo de las herramientas"
            />

            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !adminGps || loadingGps || loanTools.length === 0}
                className="px-5 py-2 text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : !adminGps ? 'Activar GPS para Confirmar' : `Confirmar Préstamo (${loanTools.length})`}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
