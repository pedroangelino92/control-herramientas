import React, { useState } from 'react';
import { 
  X, 
  Tags, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Check, 
  Lock, 
  Search,
  Layers,
  Wrench
} from 'lucide-react';
import { CategoriaItem, Herramienta } from '../../types';
import { createCategoria, updateCategoria, deleteCategoria } from '../../services/categoryService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categorias: CategoriaItem[];
  herramientas: Herramienta[];
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  categorias,
  herramientas,
}) => {
  const { userProfile, currentUser } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoriaItem | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion state
  const [categoryToDelete, setCategoryToDelete] = useState<CategoriaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  // Reset form
  const handleResetForm = () => {
    setEditingCategory(null);
    setNombre('');
    setDescripcion('');
  };

  const handleStartEdit = (cat: CategoriaItem) => {
    setEditingCategory(cat);
    setNombre(cat.nombre);
    setDescripcion(cat.descripcion || '');
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      showToast('warning', 'Nombre requerido', 'Ingresa el nombre de la categoría.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory && editingCategory.id) {
        await updateCategoria(
          editingCategory.id,
          editingCategory.nombre,
          nombre.trim(),
          descripcion.trim()
        );
        showToast('success', 'Categoría actualizada', `Se actualizó "${nombre.trim()}".`);
      } else {
        await createCategoria(
          nombre.trim(),
          descripcion.trim(),
          userProfile?.nombre || currentUser?.email || 'Administrador'
        );
        showToast('success', 'Categoría creada', `"${nombre.trim()}" agregada con éxito.`);
      }
      handleResetForm();
    } catch (err: any) {
      showToast('error', 'Error en la categoría', err.message || 'No se pudo guardar la categoría.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getToolsCountForCategory = (catName: string) => {
    return herramientas.filter(
      (h) => (h.categoria || '').trim().toLowerCase() === catName.trim().toLowerCase()
    ).length;
  };

  const handleDeleteClick = (cat: CategoriaItem) => {
    const count = getToolsCountForCategory(cat.nombre);
    if (count > 0) {
      showToast(
        'error',
        'No se puede eliminar',
        `La categoría "${cat.nombre}" tiene ${count} herramienta(s) asignada(s). Debes reasignar o eliminar esas herramientas primero.`
      );
      return;
    }
    setCategoryToDelete(cat);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete || !categoryToDelete.id) return;
    setIsDeleting(true);
    try {
      await deleteCategoria(categoryToDelete.id, categoryToDelete.nombre, herramientas);
      showToast('success', 'Categoría eliminada', `Se eliminó "${categoryToDelete.nombre}".`);
      setCategoryToDelete(null);
    } catch (err: any) {
      showToast('error', 'Error al eliminar', err.message || 'No se pudo eliminar la categoría.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categorias.filter((c) =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
    (c.descripcion && c.descripcion.toLowerCase().includes(searchTerm.toLowerCase().trim()))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm p-2.5 sm:p-4">
      <div className="min-h-full flex items-start sm:items-center justify-center py-3 sm:py-6">
        <div 
          className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xl text-zinc-100 my-auto"
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors z-10"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-4 border-b border-zinc-800/80 pb-3 pr-8">
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Tags className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Gestión de Categorías de Almacén
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Administra las categorías disponibles para clasificar las herramientas
              </p>
            </div>
          </div>

          {/* Notice: Deletion Policy */}
          <div className="mb-4 p-3 rounded-xl bg-zinc-950 border border-amber-500/20 flex items-start gap-2.5 text-xs text-zinc-300">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] sm:text-xs text-zinc-300">
              <strong className="text-amber-300 font-semibold">Regla de protección:</strong> No es posible eliminar una categoría que tenga herramientas asignadas en el inventario. Para eliminarla, reasigna o retira primero sus herramientas.
            </p>
          </div>

          {/* Create or Edit Category Form */}
          <form 
            onSubmit={handleSubmitForm} 
            className="mb-5 p-3.5 sm:p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                {editingCategory ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingCategory ? `Editar: "${editingCategory.nombre}"` : 'Nueva Categoría'}
              </span>
              {editingCategory && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-[11px] text-zinc-400 hover:text-white underline"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Equipos Láser, Hidráulica Pesada"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Instrumentos ópticos y de nivelación"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {editingCategory && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !nombre.trim()}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting
                    ? 'Guardando...'
                    : editingCategory
                    ? 'Actualizar Categoría'
                    : 'Guardar Categoría'}
                </span>
              </button>
            </div>
          </form>

          {/* Search bar inside list */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar entre categorías existentes..."
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <span className="text-xs text-zinc-400 shrink-0 font-medium">
              {filteredCategories.length} categorías
            </span>
          </div>

          {/* Categories List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredCategories.length === 0 ? (
              <div className="p-8 text-center bg-zinc-950 rounded-xl border border-dashed border-zinc-800">
                <Tags className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-zinc-400 font-semibold">
                  No se encontraron categorías con "{searchTerm}".
                </p>
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const toolsCount = getToolsCountForCategory(cat.nombre);
                const hasAssignedTools = toolsCount > 0;

                return (
                  <div
                    key={cat.id || cat.nombre}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{cat.nombre}</span>
                        {hasAssignedTools ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            title="Tiene herramientas asignadas (No se puede eliminar)"
                          >
                            <Wrench className="w-2.5 h-2.5" />
                            {toolsCount} {toolsCount === 1 ? 'herramienta' : 'herramientas'}
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700"
                            title="Sin herramientas (Se puede eliminar)"
                          >
                            0 herramientas
                          </span>
                        )}
                      </div>
                      {cat.descripcion && (
                        <p className="text-[11px] text-zinc-400 truncate max-w-md">
                          {cat.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        title={`Editar categoría "${cat.nombre}"`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(cat)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          hasAssignedTools
                            ? 'text-zinc-600 hover:text-amber-400 hover:bg-zinc-800/60 cursor-pointer'
                            : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30'
                        }`}
                        title={
                          hasAssignedTools
                            ? `Bloqueado: tiene ${toolsCount} herramienta(s) asignadas`
                            : `Eliminar categoría "${cat.nombre}"`
                        }
                      >
                        {hasAssignedTools ? (
                          <Lock className="w-3.5 h-3.5 text-zinc-500" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Close */}
          <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Safe Deletion */}
      <ConfirmationModal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`¿Eliminar categoría "${categoryToDelete?.nombre}"?`}
        message={`Esta categoría no tiene herramientas asignadas. ¿Deseas eliminarla definitivamente del catálogo de almacén?`}
        confirmText="Eliminar Categoría"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
