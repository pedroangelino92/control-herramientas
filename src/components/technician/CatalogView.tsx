import React, { useState } from 'react';
import { 
  Search, 
  Wrench, 
  MapPin, 
  Tag, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Barcode,
  Plus,
  Check,
  Layers,
  Send,
  ArrowRight
} from 'lucide-react';
import { Herramienta, CondicionHerramienta } from '../../types';
import { ToolConditionPopUp } from './ToolConditionPopUp';

interface CatalogViewProps {
  herramientas: Herramienta[];
  cart: Herramienta[];
  onAddToCart: (tool: Herramienta) => void;
  onAddToCartWithCondition?: (tool: Herramienta, condition: CondicionHerramienta, observations: string) => void;
  onRemoveFromCart: (toolId: string) => void;
  onOpenCartModal: () => void;
  onViewBarcode?: (tool: Herramienta) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ 
  herramientas, 
  cart,
  onAddToCart,
  onAddToCartWithCondition,
  onRemoveFromCart,
  onOpenCartModal,
  onViewBarcode 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [toolForConditionPopUp, setToolForConditionPopUp] = useState<Herramienta | null>(null);

  const categories = Array.from(new Set(herramientas.map((h) => h.categoria))).filter(Boolean);

  const filteredTools = herramientas.filter((tool) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      tool.nombre.toLowerCase().includes(term) ||
      tool.codigo.toLowerCase().includes(term) ||
      tool.marca.toLowerCase().includes(term) ||
      (tool.modelo && tool.modelo.toLowerCase().includes(term)) ||
      (tool.ubicacion && tool.ubicacion.toLowerCase().includes(term));

    const matchesCategory = selectedCategory === 'all' || tool.categoria === selectedCategory;
    const matchesAvailable = !onlyAvailable || tool.estado === 'Disponible';

    return matchesSearch && matchesCategory && matchesAvailable;
  });

  const availableCount = herramientas.filter((h) => h.estado === 'Disponible').length;

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-400" />
            Catálogo de Herramientas en Almacén
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Selecciona las herramientas que necesitas retirar y solicita la autorización del administrador
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-semibold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{availableCount} disponibles</span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={onOpenCartModal}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 animate-bounce"
            >
              <Layers className="w-4 h-4" />
              <span>Ver Solicitud ({cart.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, código SKU o marca..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-300 select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-zinc-950 border-zinc-700"
              />
              <span>Mostrar únicamente disponibles para retiro</span>
            </label>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      {filteredTools.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
          <Wrench className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-zinc-300">No hay herramientas coincidentes</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Intenta cambiar los términos de búsqueda o desmarcar el filtro de disponibilidad.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => {
            const isAvailable = tool.estado === 'Disponible';
            const isLoaned = tool.estado === 'Prestada';
            const isMaintenance = tool.estado === 'En Mantenimiento';
            const isInCart = cart.some((item) => item.id === tool.id);

            return (
              <div
                key={tool.id || tool.codigo}
                className={`bg-zinc-900 border rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between ${
                  isInCart 
                    ? 'border-amber-500/60 ring-1 ring-amber-500/30' 
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {tool.codigo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        isAvailable
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isLoaned
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : isMaintenance
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isAvailable && <CheckCircle2 className="w-3 h-3" />}
                      {isLoaned && <Clock className="w-3 h-3" />}
                      {isMaintenance && <AlertTriangle className="w-3 h-3" />}
                      {tool.estado}
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
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {tool.marca} {tool.modelo && `• ${tool.modelo}`}
                  </p>

                  <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-1.5 text-xs text-zinc-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Tag className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{tool.categoria}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">
                        Ubicación: <strong className="text-zinc-300">{tool.ubicacion || 'Almacén general'}</strong>
                      </span>
                    </div>

                    {tool.notas && (
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1 italic">
                        "{tool.notas}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions: Request / Add to Cart */}
                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  {onViewBarcode && (
                    <button
                      onClick={() => onViewBarcode(tool)}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Ver etiqueta"
                    >
                      <Barcode className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex-1 flex justify-end">
                    {isAvailable ? (
                      isInCart ? (
                        <button
                          type="button"
                          onClick={() => onRemoveFromCart(tool.id!)}
                          className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-rose-500/20 border border-amber-500/40 hover:border-rose-500/40 text-amber-300 hover:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 group"
                        >
                          <Check className="w-3.5 h-3.5 text-amber-400 group-hover:hidden" />
                          <span className="group-hover:hidden">En tu solicitud</span>
                          <span className="hidden group-hover:inline">Quitar de la lista</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setToolForConditionPopUp(tool)}
                          className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Solicitar Retiro</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] font-medium text-zinc-500 py-1.5 px-2">
                        {isLoaned ? 'En préstamo' : 'No disponible'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pop-up to set tool condition and notes upon adding from catalog */}
      <ToolConditionPopUp
        isOpen={!!toolForConditionPopUp}
        onClose={() => setToolForConditionPopUp(null)}
        tool={toolForConditionPopUp}
        initialCondition="Buen estado"
        initialObservations=""
        onConfirm={(t, cond, obs) => {
          if (onAddToCartWithCondition) {
            onAddToCartWithCondition(t, cond, obs);
          } else {
            onAddToCart(t);
          }
        }}
      />

      {/* Desktop-only floating Cart Bar when technician has tools in cart */}
      {cart.length > 0 && (
        <div className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4 z-30 animate-in fade-in duration-200">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/95 border border-amber-500/50 shadow-2xl backdrop-blur-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-black text-sm shadow-md">
                {cart.length}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {cart.length === 1 ? '1 herramienta en tu lista' : `${cart.length} herramientas en tu lista de retiro`}
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Haz clic en solicitar para pedir la autorización sobre el total al administrador.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenCartModal}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs sm:text-sm font-black transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <span>Revisar y Solicitar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
