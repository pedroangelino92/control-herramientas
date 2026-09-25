import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Wrench, UserCheck, Calendar, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import { Herramienta, Usuario, CondicionHerramienta, GeoLocationPoint } from '../../types';
import { registerPrestamo } from '../../services/toolService';
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

  const [selectedToolId, setSelectedToolId] = useState<string>('');
  const [selectedTecnicoUid, setSelectedTecnicoUid] = useState<string>('');
  const [fechaEstimada, setFechaEstimada] = useState<string>('');
  const [condicionEntrega, setCondicionEntrega] = useState<CondicionHerramienta>('Excelente');
  const [observaciones, setObservaciones] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [adminGps, setAdminGps] = useState<GeoLocationPoint | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);

  // Capture GPS on modal open
  useEffect(() => {
    if (isOpen) {
      setLoadingGps(true);
      captureCurrentLocation()
        .then((loc) => setAdminGps(loc))
        .finally(() => setLoadingGps(false));
    } else {
      setAdminGps(null);
    }
  }, [isOpen]);

  // Filter available tools
  const availableTools = herramientas.filter(
    (h) => h.estado === 'Disponible' || (preSelectedTool && h.id === preSelectedTool.id)
  );

  // Filter active technicians
  const activeTechnicians = usuarios.filter(
    (u) => u.estado === 'activo'
  );

  useEffect(() => {
    if (preSelectedTool && preSelectedTool.id) {
      setSelectedToolId(preSelectedTool.id);
    } else if (availableTools.length > 0 && !selectedToolId) {
      setSelectedToolId(availableTools[0].id || '');
    }

    if (activeTechnicians.length > 0 && !selectedTecnicoUid) {
      setSelectedTecnicoUid(activeTechnicians[0].uid);
    }

    // Default return date: 3 days from now
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 3);
    returnDate.setHours(18, 0, 0, 0);
    setFechaEstimada(returnDate.toISOString().slice(0, 16));
  }, [preSelectedTool, isOpen, availableTools.length, activeTechnicians.length]);

  if (!isOpen) return null;

  const currentSelectedTool = availableTools.find((h) => h.id === selectedToolId);
  const currentSelectedTecnico = activeTechnicians.find((u) => u.uid === selectedTecnicoUid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedTool) {
      showToast('warning', 'Selecciona una herramienta', 'Debes elegir una herramienta disponible.');
      return;
    }
    if (!currentSelectedTecnico) {
      showToast('warning', 'Selecciona un técnico', 'Debes asignar la herramienta a un técnico activo.');
      return;
    }

    let finalGps = adminGps;
    if (!finalGps) {
      setLoadingGps(true);
      finalGps = await captureCurrentLocation();
      setLoadingGps(false);
      if (finalGps) setAdminGps(finalGps);
    }

    if (!finalGps) {
      showToast('error', 'GPS Obligatorio', 'Debes tener la ubicación encendida para registrar la salida de herramientas.');
      return;
    }

    setLoading(true);
    try {
      await registerPrestamo({
        herramienta: currentSelectedTool,
        tecnico: currentSelectedTecnico,
        adminNombre: userProfile?.nombre || currentUser?.email || 'Administrador',
        adminUid: currentUser?.uid || 'admin',
        fechaEstimadaDevolucion: new Date(fechaEstimada).toISOString(),
        condicionEntrega,
        observacionesEntrega: observaciones.trim(),
        geoEntrega: finalGps,
      });

      showToast(
        'success',
        'Préstamo Registrado',
        `"${currentSelectedTool.nombre}" asignada a ${currentSelectedTecnico.nombre}.`
      );

      if (onLoanCompleted) onLoanCompleted();
      onClose();
    } catch (err: any) {
      showToast('error', 'Error al registrar préstamo', err.message || 'Error en la operación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-zinc-100 my-8"
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

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ArrowRight className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Registrar Salida / Préstamo</h3>
            <p className="text-xs text-zinc-400">
              Asigna una herramienta disponible a un técnico con fecha estimada de entrega
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
        ) : activeTechnicians.length === 0 ? (
          <div className="p-6 bg-zinc-950 rounded-xl border border-zinc-800 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-sm font-semibold text-zinc-200">No hay técnicos activos registrados</p>
            <p className="text-xs text-zinc-400">
              Ve a la sección "Gestión de Usuarios" y aprueba al menos un técnico para poder asignarle herramientas.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-colors"
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tool Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Herramienta a Entregar *
              </label>
              <select
                value={selectedToolId}
                onChange={(e) => setSelectedToolId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              >
                {availableTools.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    [{tool.codigo}] {tool.nombre} - {tool.marca} ({tool.ubicacion || 'Almacén'})
                  </option>
                ))}
              </select>
            </div>

            {/* Technician Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Técnico Responsable *
              </label>
              <select
                value={selectedTecnicoUid}
                onChange={(e) => setSelectedTecnicoUid(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {activeTechnicians.map((tech) => (
                  <option key={tech.uid} value={tech.uid}>
                    {tech.nombre} ({tech.email}) • {tech.rol === 'admin' ? 'Administrador' : 'Técnico'}
                  </option>
                ))}
              </select>
            </div>

            {/* Return Date & Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Fecha Estimada de Devolución *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={fechaEstimada}
                  onChange={(e) => setFechaEstimada(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Condición de Entrega *
                </label>
                <select
                  value={condicionEntrega}
                  onChange={(e) => setCondicionEntrega(e.target.value as CondicionHerramienta)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Excelente">Excelente (Como nueva)</option>
                  <option value="Bueno">Bueno (En perfecto funcionamiento)</option>
                  <option value="Desgaste normal">Desgaste normal (Con marcas de uso)</option>
                </select>
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Observaciones de Entrega
              </label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Se entrega con 2 baterías cargadas y juego de brocas..."
                className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            {/* Preview Box */}
            {currentSelectedTool && (
              <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                    <Wrench className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{currentSelectedTool.nombre}</p>
                    <p className="text-zinc-400">{currentSelectedTool.categoria} • Ubicación: {currentSelectedTool.ubicacion}</p>
                  </div>
                </div>
                <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                  {currentSelectedTool.codigo}
                </span>
              </div>
            )}

            {/* Mandatory GPS notice for loan */}
            <GpsRequirementNotice
              gps={adminGps}
              loading={loadingGps}
              onGpsAcquired={setAdminGps}
              actionName="registrar la entrega y préstamo de la herramienta"
            />

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !adminGps || loadingGps}
                className="px-5 py-2 text-sm font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : !adminGps ? 'Activar GPS para Confirmar' : 'Confirmar Préstamo'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
