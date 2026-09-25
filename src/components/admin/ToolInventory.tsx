import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Wrench, 
  Barcode, 
  Edit, 
  Trash2, 
  ArrowRight, 
  RotateCcw, 
  MapPin, 
  Tag, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Ban,
  Layers,
  LayoutGrid,
  List,
  Tags
} from 'lucide-react';
import { Herramienta, EstadoHerramienta, CategoriaHerramienta, CategoriaItem, SUPERADMIN_EMAIL } from '../../types';
import { deleteHerramienta } from '../../services/toolService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { CategoryManagementModal } from './CategoryManagementModal';

interface ToolInventoryProps {
  herramientas: Herramienta[];
  categorias?: CategoriaItem[];
  onOpenNewToolModal: () => void;
  onEditTool: (tool: Herramienta) => void;
  onViewBarcode: (tool: Herramienta) => void;
  onStartLoan: (tool: Herramienta) => void;
  onStartReturn: (tool: Herramienta) => void;
}

export const ToolInventory: React.FC<ToolInventoryProps> = ({
  herramientas,
  categorias = [],
  onOpenNewToolModal,
  onEditTool,
  onViewBarcode,
  onStartLoan,
  onStartReturn,
}) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Delete modal state
  const [toolToDelete, setToolToDelete] = useState<Herramienta | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Filter tools
  const filteredTools = herramientas.filter((tool) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (tool.nombre && tool.nombre.toLowerCase().includes(term)) ||
      (tool.codigo && tool.codigo.toLowerCase().includes(term)) ||
      (tool.marca && tool.marca.toLowerCase().includes(term)) ||
      (tool.modelo && tool.modelo.toLowerCase().includes(term)) ||
      (tool.ubicacion && tool.ubicacion.toLowerCase().includes(term));

    const matchesCategory = selectedCategory === 'all' || tool.categoria === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || tool.estado === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDeleteConfirm = async () => {
    if (!toolToDelete || !toolToDelete.id) return;
    if (!isSuperAdmin) {
      showToast('error', 'Permiso denegado', 'Solo el administrador principal (pedroangelino92@gmail.com) puede eliminar herramientas.');
      return;
    }
    setIsDeleting(true);
    try {
      await deleteHerramienta(toolToDelete.id);
      showToast('success', 'Herramienta eliminada', `Se eliminó "${toolToDelete.nombre}" del inventario.`);
      setToolToDelete(null);
    } catch (err: any) {
      showToast('error', 'Error al eliminar', err.message || 'No se pudo eliminar la herramienta.');
    } finally {
      setIsDeleting(false);
    }
  };

  const categories = Array.from(new Set(herramientas.map((h) => h.categoria))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-400" />
            Inventario de Herramientas
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {herramientas.length} herramientas registradas en total ({filteredTools.length} visibles)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="Vista cuadrícula"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="Vista tabla"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenNewToolModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Herramienta</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
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

          {/* Category Filter */}
          <div className="relative">
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

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos los estados</option>
              <option value="Disponible">Disponible (En Almacén)</option>
              <option value="Prestada">Prestada (En Uso)</option>
              <option value="En Mantenimiento">En Mantenimiento</option>
              <option value="Fuera de servicio">Fuera de servicio</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tools Content */}
      {filteredTools.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
          <Wrench className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-zinc-300">No se encontraron herramientas</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'Prueba ajustando los filtros de búsqueda o categoría.'
              : 'Agrega tu primera herramienta con el botón superior para comenzar a llevar el control.'}
          </p>
          <button
            onClick={onOpenNewToolModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar Herramienta
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => {
            const isAvailable = tool.estado === 'Disponible';
            const isLoaned = tool.estado === 'Prestada';
            const isMaintenance = tool.estado === 'En Mantenimiento';
            const isOutOfService = tool.estado === 'Fuera de servicio';

            return (
              <div
                key={tool.id || tool.codigo}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card top banner */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      {tool.codigo}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${
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
                      {isOutOfService && <Ban className="w-3 h-3" />}
                      {tool.estado}
                    </span>
                  </div>

                  {/* Image preview or icon */}
                  {tool.fotoUrl ? (
                    <div className="h-36 w-full rounded-xl overflow-hidden mb-3 bg-zinc-950 border border-zinc-800 relative">
                      <img
                        src={tool.fotoUrl}
                        alt={tool.nombre}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  ) : null}

                  <h3 className="font-bold text-white text-base leading-snug group-hover:text-amber-400 transition-colors">
                    {tool.nombre}
                  </h3>

                  {(tool.marca || tool.modelo) ? (
                    <p className="text-xs text-zinc-400 mt-1">
                      {tool.marca && <span className="font-semibold text-zinc-300">{tool.marca}</span>}
                      {tool.modelo && ` • Mod: ${tool.modelo}`}
                    </p>
                  ) : null}

                  <div className="mt-3 space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800/80 pt-3">
                    <div className="flex items-center gap-1.5 truncate">
                      <Tag className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{tool.categoria}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{tool.ubicacion || 'Almacén general'}</span>
                    </div>

                    {isLoaned && tool.tecnicoAsignadoNombre && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs mt-2">
                        <span className="font-semibold">En poder de: </span>
                        {tool.tecnicoAsignadoNombre}
                      </div>
                    )}

                    {tool.notas && (
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1 italic">
                        "{tool.notas}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewBarcode(tool)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Ver etiqueta y código de barras"
                      aria-label="Ver código de barras"
                    >
                      <Barcode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditTool(tool)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Editar herramienta"
                      aria-label="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => setToolToDelete(tool)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Eliminar herramienta (Solo admin)"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    {isAvailable && (
                      <button
                        onClick={() => onStartLoan(tool)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1"
                      >
                        Prestar
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    {isLoaned && (
                      <button
                        onClick={() => onStartReturn(tool)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Devolver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Table View */
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800 font-bold">
                <tr>
                  <th className="px-4 py-3">Código SKU</th>
                  <th className="px-4 py-3">Herramienta</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredTools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">
                      {tool.codigo}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{tool.nombre}</div>
                      {(tool.marca || tool.modelo) ? (
                        <div className="text-[11px] text-zinc-400">
                          {tool.marca} {tool.modelo}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{tool.categoria}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tool.estado === 'Disponible'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tool.estado === 'Prestada'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tool.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{tool.ubicacion || 'General'}</td>
                    <td className="px-4 py-3">
                      {tool.tecnicoAsignadoNombre ? (
                        <span className="text-amber-300 font-medium">{tool.tecnicoAsignadoNombre}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {tool.estado === 'Disponible' && (
                          <button
                            onClick={() => onStartLoan(tool)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold transition-colors"
                          >
                            Prestar
                          </button>
                        )}
                        {tool.estado === 'Prestada' && (
                          <button
                            onClick={() => onStartReturn(tool)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold transition-colors"
                          >
                            Devolver
                          </button>
                        )}
                        <button
                          onClick={() => onViewBarcode(tool)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="Ver Código"
                        >
                          <Barcode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditTool(tool)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => setToolToDelete(tool)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                            title="Eliminar herramienta (Solo admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for deletion */}
      <ConfirmationModal
        isOpen={Boolean(toolToDelete)}
        onClose={() => setToolToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Herramienta"
        message={`¿Estás seguro de que deseas dar de baja o eliminar permanentemente "${toolToDelete?.nombre}" (${toolToDelete?.codigo}) del inventario? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Permanentemente"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
