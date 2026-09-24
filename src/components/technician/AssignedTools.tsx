import React from 'react';
import { 
  Wrench, 
  Clock, 
  Calendar, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  Barcode,
  ArrowLeftRight,
  ExternalLink
} from 'lucide-react';
import { Herramienta, Prestamo } from '../../types';
import { getGoogleMapsUrl } from '../../services/geoService';

interface AssignedToolsProps {
  assignedTools: Herramienta[];
  activeLoans: Prestamo[];
  onViewBarcode: (tool: Herramienta) => void;
  onStartTransferInField?: (tool: Herramienta) => void;
}

export const AssignedTools: React.FC<AssignedToolsProps> = ({
  assignedTools,
  activeLoans,
  onViewBarcode,
  onStartTransferInField,
}) => {
  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Wrench className="w-6 h-6 text-amber-400" />
          Mis Herramientas Asignadas
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Equipos y herramientas bajo tu custodia y responsabilidad directa
        </p>
      </div>

      {assignedTools.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-200">No tienes herramientas asignadas</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Actualmente no tienes herramientas pendientes de devolución. Si requieres algún equipo para tus labores, consulta el catálogo y solicítalo con el administrador del almacén.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignedTools.map((tool) => {
            const correspondingLoan = activeLoans.find(
              (l) => l.herramientaId === tool.id && l.estado === 'Activo'
            );

            const isOverdue =
              correspondingLoan &&
              new Date(correspondingLoan.fechaEstimadaDevolucion) < now;

            return (
              <div
                key={tool.id || tool.codigo}
                className={`bg-zinc-900 border rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between ${
                  isOverdue
                    ? 'border-rose-800/60 bg-rose-950/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      {tool.codigo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOverdue
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isOverdue ? 'Atrasada' : 'En tu posesión'}
                    </span>
                  </div>

                  {tool.fotoUrl && (
                    <div className="h-32 w-full rounded-xl overflow-hidden mb-3 bg-zinc-950 border border-zinc-800">
                      <img
                        src={tool.fotoUrl}
                        alt={tool.nombre}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <h3 className="font-bold text-white text-base leading-snug">{tool.nombre}</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {tool.marca} {tool.modelo && `• ${tool.modelo}`}
                  </p>

                  <div className="mt-4 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-1.5 text-xs text-zinc-300">
                    {correspondingLoan && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Fecha de entrega:</span>
                          <span>{new Date(correspondingLoan.fechaPrestamo).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Devolución límite:</span>
                          <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-zinc-200'}>
                            {new Date(correspondingLoan.fechaEstimadaDevolucion).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Condición inicial:</span>
                          <span className="text-amber-400">{correspondingLoan.condicionEntrega}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-zinc-800/80">
                      <span className="text-zinc-500">Ubicación / Base:</span>
                      <span className="truncate max-w-[150px]">{tool.ubicacion || 'Almacén general'}</span>
                    </div>

                    {/* Geolocation info if available */}
                    {correspondingLoan?.geoEntrega && (
                      <div className="flex justify-between items-center pt-1 border-t border-zinc-800/80 text-[11px]">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          GPS Retiro:
                        </span>
                        <a
                          href={getGoogleMapsUrl(correspondingLoan.geoEntrega.latitude, correspondingLoan.geoEntrega.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
                        >
                          <span>{correspondingLoan.geoEntrega.latitude}, {correspondingLoan.geoEntrega.longitude}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    {correspondingLoan?.esTraspasoEnCampo && (
                      <div className="mt-1 p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold flex items-center gap-1.5">
                        <ArrowLeftRight className="w-3 h-3 shrink-0" />
                        <span>Recibido por traspaso en campo</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => onViewBarcode(tool)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                  >
                    <Barcode className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ficha / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onStartTransferInField?.(tool)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition-all shadow-md active:scale-95"
                    title="Pasar herramienta mano a mano a otro compañero en el campo"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Traspasar a Compañero</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
