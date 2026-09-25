import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Wrench, RotateCcw } from 'lucide-react';
import { Prestamo, CondicionHerramienta, EstadoHerramienta, GeoLocationPoint } from '../../types';
import { returnHerramientaLoan } from '../../services/toolService';
import { captureCurrentLocation } from '../../services/geoService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { GpsRequirementNotice } from '../common/GpsRequirementNotice';

interface ReturnLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  prestamo: Prestamo | null;
  onReturnCompleted?: () => void;
}

export const ReturnLoanModal: React.FC<ReturnLoanModalProps> = ({
  isOpen,
  onClose,
  prestamo,
  onReturnCompleted,
}) => {
  const { userProfile, currentUser } = useAuth();
  const { showToast } = useToast();

  const [condicionDevolucion, setCondicionDevolucion] = useState<CondicionHerramienta>('Bueno');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminGps, setAdminGps] = useState<GeoLocationPoint | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);

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

  if (!isOpen || !prestamo) return null;

  const isDamaged = condicionDevolucion === 'Dañada / Requiere servicio';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalGps = adminGps;
    if (!finalGps) {
      setLoadingGps(true);
      finalGps = await captureCurrentLocation();
      setLoadingGps(false);
      if (finalGps) setAdminGps(finalGps);
    }

    if (!finalGps) {
      showToast('error', 'GPS Obligatorio', 'Debes tener la ubicación encendida para registrar la devolución de la herramienta.');
      return;
    }

    setLoading(true);

    try {
      const targetToolStatus: EstadoHerramienta = isDamaged ? 'En Mantenimiento' : 'Disponible';

      await returnHerramientaLoan({
        prestamo,
        condicionDevolucion,
        observacionesDevolucion: observaciones.trim(),
        recibidoPorNombre: userProfile?.nombre || currentUser?.email || 'Administrador',
        recibidoPorUid: currentUser?.uid || 'admin',
        destinoEstadoHerramienta: targetToolStatus,
        geoDevolucion: finalGps,
      });

      showToast(
        'success',
        'Herramienta Devuelta',
        `"${prestamo.herramientaNombre}" ingresada al almacén (${targetToolStatus}).`
      );

      if (onReturnCompleted) onReturnCompleted();
      onClose();
    } catch (err: any) {
      showToast('error', 'Error al procesar devolución', err.message || 'Error en la operación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-zinc-100 my-8"
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
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Registrar Devolución de Herramienta</h3>
            <p className="text-xs text-zinc-400">
              Verifica el estado físico y operativo antes de reintegrarla al inventario
            </p>
          </div>
        </div>

        {/* Loan Details Banner */}
        <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 mb-5 space-y-2 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
            <span className="text-zinc-400">Herramienta:</span>
            <span className="font-bold text-white font-mono">[{prestamo.herramientaCodigo}] {prestamo.herramientaNombre}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Técnico que entrega:</span>
            <span className="font-semibold text-zinc-200">{prestamo.tecnicoNombre}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Fecha de retiro:</span>
            <span className="text-zinc-300">{new Date(prestamo.fechaPrestamo).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Condición al salir:</span>
            <span className="text-amber-400 font-medium">{prestamo.condicionEntrega}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Verificación de Estado / Condición al Devolver *
            </label>
            <select
              value={condicionDevolucion}
              onChange={(e) => setCondicionDevolucion(e.target.value as CondicionHerramienta)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Excelente">Excelente (Impecable, limpia y completa)</option>
              <option value="Bueno">Bueno (En perfecto funcionamiento)</option>
              <option value="Desgaste normal">Desgaste normal (Con marcas de uso estándar)</option>
              <option value="Dañada / Requiere servicio">Dañada / Requiere servicio o mantenimiento</option>
            </select>
          </div>

          {isDamaged && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                La herramienta se marcará automáticamente como <strong>"En Mantenimiento"</strong> para que no esté disponible hasta su revisión técnica.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Observaciones de Recepción
            </label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Retorna completa con accesorios limpios. Sin anomalías..."
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Mandatory GPS Notice for tool return */}
          <GpsRequirementNotice
            gps={adminGps}
            loading={loadingGps}
            onGpsAcquired={setAdminGps}
            actionName="registrar la devolución y certificar el ingreso al almacén"
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
              className="px-5 py-2 text-sm font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : !adminGps ? 'Activar GPS para Devolver' : 'Confirmar Devolución'}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
