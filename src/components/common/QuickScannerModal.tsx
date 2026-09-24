import React, { useState } from 'react';
import { X, Search, ScanBarcode, ArrowRight, Wrench, CheckCircle2, Clock } from 'lucide-react';
import { Herramienta } from '../../types';

interface QuickScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  herramientas: Herramienta[];
  onSelectTool: (tool: Herramienta, action?: 'view' | 'loan' | 'return') => void;
}

export const QuickScannerModal: React.FC<QuickScannerModalProps> = ({
  isOpen,
  onClose,
  herramientas,
  onSelectTool,
}) => {
  const [scanInput, setScanInput] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const cleanInput = scanInput.trim().toLowerCase();
  const matchedTools = cleanInput
    ? herramientas.filter(
        (h) =>
          h.codigo.toLowerCase().includes(cleanInput) ||
          h.nombre.toLowerCase().includes(cleanInput) ||
          h.marca.toLowerCase().includes(cleanInput) ||
          (h.numeroSerie && h.numeroSerie.toLowerCase().includes(cleanInput))
      )
    : [];

  const handleSelect = (tool: Herramienta, action?: 'view' | 'loan' | 'return') => {
    onSelectTool(tool, action);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-zinc-100"
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

        <div className="flex items-center gap-2 mb-2 text-amber-400">
          <ScanBarcode className="w-5 h-5" />
          <h3 className="text-lg font-bold text-white">Escáner / Búsqueda Rápida de Código</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Ingresa o escanea con pistola lectora el código SKU, código de barras o número de serie.
        </p>

        {/* Input box */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={scanInput}
            onChange={(e) => {
              setScanInput(e.target.value);
              setHasSearched(true);
            }}
            placeholder="Ej: HR-EL-001 o Taladro..."
            autoFocus
            className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
          />
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {cleanInput && matchedTools.length === 0 && (
            <div className="text-center py-8 text-zinc-400">
              <p className="text-sm font-medium">No se encontró ninguna herramienta con ese código.</p>
              <p className="text-xs text-zinc-500 mt-1">Verifica el código e inténtalo de nuevo.</p>
            </div>
          )}

          {!cleanInput && (
            <div className="p-4 bg-zinc-950/60 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-400">
              <ScanBarcode className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-80" />
              Esperando lectura de código... También puedes escribir el nombre de la herramienta.
            </div>
          )}

          {matchedTools.map((tool) => {
            const isAvailable = tool.estado === 'Disponible';
            const isLoaned = tool.estado === 'Prestada';

            return (
              <div
                key={tool.id || tool.codigo}
                className="p-3.5 bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                    <Wrench className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {tool.codigo}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isAvailable
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isLoaned
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tool.estado}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate mt-1">{tool.nombre}</p>
                    <p className="text-xs text-zinc-400 truncate">
                      {tool.marca} • Ubicación: {tool.ubicacion || 'General'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleSelect(tool, 'view')}
                    className="px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Ver
                  </button>
                  {isAvailable && (
                    <button
                      onClick={() => handleSelect(tool, 'loan')}
                      className="px-2.5 py-1.5 text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1"
                    >
                      Prestar
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {isLoaned && (
                    <button
                      onClick={() => handleSelect(tool, 'return')}
                      className="px-2.5 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors"
                    >
                      Recibir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
