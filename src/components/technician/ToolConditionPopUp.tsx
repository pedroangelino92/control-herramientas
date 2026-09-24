import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wrench, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  FileText,
  MapPin
} from 'lucide-react';
import { Herramienta, CondicionHerramienta } from '../../types';

interface ToolConditionPopUpProps {
  isOpen: boolean;
  onClose: () => void;
  tool: Herramienta | null;
  initialCondition?: CondicionHerramienta;
  initialObservations?: string;
  onConfirm: (tool: Herramienta, condition: CondicionHerramienta, observations: string) => void;
}

const CONDITION_CARDS: {
  value: CondicionHerramienta;
  label: string;
  shortDesc: string;
  activeClass: string;
  idleClass: string;
  icon: (active: boolean) => React.ReactNode;
}[] = [
  {
    value: 'Buen estado',
    label: 'Buen estado',
    shortDesc: 'Operativo y limpio',
    activeClass: 'bg-emerald-500 text-black font-black ring-2 ring-emerald-400 shadow-md shadow-emerald-500/25',
    idleClass: 'bg-zinc-950/70 text-zinc-300 border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5',
    icon: (active: boolean) => (
      <CheckCircle2 className={`w-4 h-4 ${active ? 'text-black' : 'text-emerald-400'}`} />
    ),
  },
  {
    value: 'Falta mantenimiento',
    label: 'Mantenimiento',
    shortDesc: 'Requiere servicio',
    activeClass: 'bg-amber-500 text-black font-black ring-2 ring-amber-400 shadow-md shadow-amber-500/25',
    idleClass: 'bg-zinc-950/70 text-zinc-300 border-zinc-800 hover:border-amber-500/50 hover:bg-amber-500/5',
    icon: (active: boolean) => (
      <AlertTriangle className={`w-4 h-4 ${active ? 'text-black' : 'text-amber-400'}`} />
    ),
  },
  {
    value: 'Dañado',
    label: 'Dañado',
    shortDesc: 'Falla o avería',
    activeClass: 'bg-rose-500 text-white font-black ring-2 ring-rose-400 shadow-md shadow-rose-500/25',
    idleClass: 'bg-zinc-950/70 text-zinc-300 border-zinc-800 hover:border-rose-500/50 hover:bg-rose-500/5',
    icon: (active: boolean) => (
      <XCircle className={`w-4 h-4 ${active ? 'text-white' : 'text-rose-400'}`} />
    ),
  },
];

export const ToolConditionPopUp: React.FC<ToolConditionPopUpProps> = ({
  isOpen,
  onClose,
  tool,
  initialCondition = 'Buen estado',
  initialObservations = '',
  onConfirm,
}) => {
  const [selectedCondition, setSelectedCondition] = useState<CondicionHerramienta>(initialCondition);
  const [observations, setObservations] = useState<string>(initialObservations);

  useEffect(() => {
    if (isOpen) {
      if (initialCondition === 'Excelente' || initialCondition === 'Bueno') {
        setSelectedCondition('Buen estado');
      } else if (initialCondition === 'Desgaste normal') {
        setSelectedCondition('Falta mantenimiento');
      } else if (initialCondition === 'Dañada / Requiere servicio') {
        setSelectedCondition('Dañado');
      } else {
        setSelectedCondition(initialCondition || 'Buen estado');
      }
      setObservations(initialObservations || '');
    }
  }, [isOpen, initialCondition, initialObservations]);

  if (!isOpen || !tool) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(tool, selectedCondition, observations.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/90 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Wrench className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-white tracking-tight leading-tight truncate">
                Estado Físico de la Herramienta
              </h3>
              <p className="text-[10px] text-zinc-400 leading-none truncate">
                Indica cómo estás retirando el equipo del almacén
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Body without any scrolling required */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3">
          {/* Tool Info Strip */}
          <div className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[10px] font-bold text-amber-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">
                {tool.codigo}
              </span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate leading-tight">
                  {tool.nombre}
                </h4>
                <p className="text-[10px] text-zinc-400 truncate leading-none">
                  {tool.marca} {tool.modelo && `• ${tool.modelo}`}
                </p>
              </div>
            </div>

            <div className="text-[10px] text-zinc-400 shrink-0 flex items-center gap-1 font-medium bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850">
              <MapPin className="w-3 h-3 text-amber-400" />
              <span className="truncate max-w-[120px]">{tool.ubicacion || 'Almacén central'}</span>
            </div>
          </div>

          {/* Condition Options: 3-column compact grid */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-zinc-200">
              Condición al retirar: *
            </label>

            <div className="grid grid-cols-3 gap-2">
              {CONDITION_CARDS.map((opt) => {
                const isSelected = selectedCondition === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedCondition(opt.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col items-center justify-center text-center gap-1 cursor-pointer active:scale-95 ${
                      isSelected ? opt.activeClass : opt.idleClass
                    }`}
                  >
                    {opt.icon(isSelected)}
                    <span className="text-[11px] font-black leading-tight">
                      {opt.label}
                    </span>
                    <span className={`text-[9px] leading-tight ${isSelected ? 'opacity-90 font-medium' : 'text-zinc-500'}`}>
                      {opt.shortDesc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Observations input (single line or compact) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300 flex items-center gap-1">
              <FileText className="w-3 h-3 text-amber-400" />
              Observaciones del estado (Opcional):
            </label>
            <input
              type="text"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ej: Carcasa con marcas leves, cable limpio, maletín..."
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Confirmar y Agregar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
