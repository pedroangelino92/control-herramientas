import React, { useState, useEffect } from 'react';
import { X, Wrench, Image, Sparkles, AlertCircle } from 'lucide-react';
import { Herramienta, CategoriaHerramienta, EstadoHerramienta } from '../../types';
import { createHerramienta, updateHerramienta } from '../../services/toolService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

interface ToolFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolToEdit?: Herramienta | null;
  onSaved?: () => void;
}

const CATEGORIES: CategoriaHerramienta[] = [
  'Herramientas Eléctricas',
  'Herramientas Manuales',
  'Medición y Diagnóstico',
  'Neumáticas e Hidráulicas',
  'Corte y Desbaste',
  'Soldadura',
  'Seguridad y EPP',
  'Equipos de Elevación',
  'Otros',
];

const PRESET_IMAGES = [
  { label: 'Taladro / Percutor', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80' },
  { label: 'Amoladora / Sierra', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80' },
  { label: 'Medición / Multímetro', url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80' },
  { label: 'Llaves / Manuales', url: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=600&auto=format&fit=crop&q=80' },
  { label: 'Soldadura / Taller', url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&auto=format&fit=crop&q=80' },
];

export const ToolFormModal: React.FC<ToolFormModalProps> = ({
  isOpen,
  onClose,
  toolToEdit,
  onSaved,
}) => {
  const { userProfile, currentUser } = useAuth();
  const { showToast } = useToast();

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [categoria, setCategoria] = useState<CategoriaHerramienta>('Herramientas Eléctricas');
  const [estado, setEstado] = useState<EstadoHerramienta>('Disponible');
  const [ubicacion, setUbicacion] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [notas, setNotas] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (toolToEdit) {
      setCodigo(toolToEdit.codigo || '');
      setNombre(toolToEdit.nombre || '');
      setMarca(toolToEdit.marca || '');
      setModelo(toolToEdit.modelo || '');
      setCategoria(toolToEdit.categoria || 'Herramientas Eléctricas');
      setEstado(toolToEdit.estado || 'Disponible');
      setUbicacion(toolToEdit.ubicacion || '');
      setNumeroSerie(toolToEdit.numeroSerie || '');
      setNotas(toolToEdit.notas || '');
      setFotoUrl(toolToEdit.fotoUrl || '');
    } else {
      // Auto-generate code SKU suggestion
      const randomId = Math.floor(100 + Math.random() * 900);
      setCodigo(`HR-EQ-${randomId}`);
      setNombre('');
      setMarca('');
      setModelo('');
      setCategoria('Herramientas Eléctricas');
      setEstado('Disponible');
      setUbicacion('Estante Principal');
      setNumeroSerie('');
      setNotas('');
      setFotoUrl('');
    }
  }, [toolToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) {
      showToast('warning', 'Campos incompletos', 'El código y el nombre son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      if (toolToEdit && toolToEdit.id) {
        await updateHerramienta(toolToEdit.id, {
          codigo: codigo.trim().toUpperCase(),
          nombre: nombre.trim(),
          marca: marca.trim(),
          modelo: modelo.trim(),
          categoria,
          estado,
          ubicacion: ubicacion.trim(),
          numeroSerie: numeroSerie.trim(),
          notas: notas.trim(),
          fotoUrl: fotoUrl.trim(),
        });
        showToast('success', 'Herramienta actualizada', `Se guardaron los cambios para "${nombre}".`);
      } else {
        await createHerramienta({
          codigo: codigo.trim().toUpperCase(),
          nombre: nombre.trim(),
          marca: marca.trim(),
          modelo: modelo.trim(),
          categoria,
          estado,
          ubicacion: ubicacion.trim(),
          numeroSerie: numeroSerie.trim(),
          notas: notas.trim(),
          fotoUrl: fotoUrl.trim(),
          creadoPor: userProfile?.nombre || currentUser?.email || 'Administrador',
        });
        showToast('success', 'Herramienta creada', `"${nombre}" agregada al inventario.`);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      showToast('error', 'Error al guardar', err.message || 'No se pudo guardar la herramienta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-zinc-100 my-8"
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
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {toolToEdit ? 'Editar Herramienta' : 'Nueva Herramienta'}
            </h3>
            <p className="text-xs text-zinc-400">
              Registra los datos técnicos y de ubicación para control de inventario
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Código / SKU / Código de Barras *
              </label>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: HR-EL-001"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nombre de la Herramienta *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Taladro Percutor 20V"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Marca
              </label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ej: DeWalt, Bosch, Fluke"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Modelo / Referencia
              </label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ej: DCD796D2"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Categoría *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaHerramienta)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Estado Inicial / Actual *
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoHerramienta)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Disponible">Disponible (En Almacén)</option>
                <option value="Prestada">Prestada (En Uso)</option>
                <option value="En Mantenimiento">En Mantenimiento</option>
                <option value="Fuera de servicio">Fuera de servicio (Baja)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Ubicación en Almacén / Taller
              </label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ej: Estante A-2, Gabinete 3"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Número de Serie (Opcional)
              </label>
              <input
                type="text"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                placeholder="Ej: SN-49910-2024"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              URL de Foto (Opcional)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={fotoUrl}
                onChange={(e) => setFotoUrl(e.target.value)}
                placeholder="https://ejemplo.com/foto.jpg"
                className="flex-1 px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            
            {/* Quick image preset chips */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Presets:
              </span>
              {PRESET_IMAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFotoUrl(preset.url)}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[10px] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Notas, Accesorios y Observaciones
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Incluye maletín, 2 baterías, accesorios o advertencias..."
              className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

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
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Guardando...' : toolToEdit ? 'Actualizar Herramienta' : 'Crear Herramienta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
