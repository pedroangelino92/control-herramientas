import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Wrench, 
  Camera, 
  UploadCloud, 
  Trash2, 
  Check, 
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { Herramienta, CategoriaHerramienta, EstadoHerramienta, CategoriaItem, DEFAULT_CATEGORIES } from '../../types';
import { createHerramienta, updateHerramienta } from '../../services/toolService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

interface ToolFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolToEdit?: Herramienta | null;
  onSaved?: () => void;
  categorias?: CategoriaItem[];
}

// In-browser compression to clean, lightweight Data URL
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 900;
        const maxHeight = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('No se pudo procesar la imagen'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
};

export const ToolFormModal: React.FC<ToolFormModalProps> = ({
  isOpen,
  onClose,
  toolToEdit,
  onSaved,
  categorias,
}) => {
  const { userProfile, currentUser } = useAuth();
  const { showToast } = useToast();

  const availableCategories = (categorias && categorias.length > 0)
    ? categorias.map((c) => c.nombre)
    : DEFAULT_CATEGORIES;

  const defaultCategory = availableCategories[0] || 'Herramientas Eléctricas';

  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<CategoriaHerramienta>(defaultCategory);
  const [estado, setEstado] = useState<EstadoHerramienta>('Disponible');
  const [ubicacion, setUbicacion] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (toolToEdit) {
      setCodigo(toolToEdit.codigo || '');
      setDescripcion(toolToEdit.descripcion || toolToEdit.nombre || '');
      setCategoria(toolToEdit.categoria || defaultCategory);
      setEstado(toolToEdit.estado || 'Disponible');
      setUbicacion(toolToEdit.ubicacion || '');
      setFotoUrl(toolToEdit.fotoUrl || '');
    } else {
      setCodigo('');
      setDescripcion('');
      setCategoria(defaultCategory);
      setEstado('Disponible');
      setUbicacion('');
      setFotoUrl('');
    }
  }, [toolToEdit, isOpen, defaultCategory]);

  if (!isOpen) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Formato no válido', 'Por favor selecciona un archivo de imagen válido.');
      return;
    }

    setProcessingPhoto(true);
    try {
      const compressedDataUrl = await compressImageFile(file);
      setFotoUrl(compressedDataUrl);
      showToast('success', 'Foto capturada', 'La foto de la herramienta fue agregada.');
    } catch (err: any) {
      console.error('Error compressing image:', err);
      showToast('error', 'Error con la foto', 'No se pudo procesar la imagen seleccionada.');
    } finally {
      setProcessingPhoto(false);
      // Clear file input so same file can be re-selected if retrying
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setFotoUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) {
      showToast('warning', 'Código requerido', 'Debes ingresar el código interno de la herramienta.');
      return;
    }
    if (!descripcion.trim()) {
      showToast('warning', 'Descripción requerida', 'Debes ingresar la descripción de la herramienta.');
      return;
    }
    if (!ubicacion.trim()) {
      showToast('warning', 'Ubicación requerida', 'Indica la ubicación en almacén o taller.');
      return;
    }

    setLoading(true);
    try {
      const cleanCodigo = codigo.trim().toUpperCase();
      const cleanDesc = descripcion.trim();
      const cleanUbicacion = ubicacion.trim();

      if (toolToEdit && toolToEdit.id) {
        await updateHerramienta(toolToEdit.id, {
          codigo: cleanCodigo,
          nombre: cleanDesc,
          descripcion: cleanDesc,
          categoria,
          estado,
          ubicacion: cleanUbicacion,
          fotoUrl: fotoUrl.trim(),
        });
        showToast('success', 'Herramienta actualizada', `Se guardaron los cambios para "${cleanDesc}".`);
      } else {
        await createHerramienta({
          codigo: cleanCodigo,
          nombre: cleanDesc,
          descripcion: cleanDesc,
          marca: '',
          modelo: '',
          categoria,
          estado,
          ubicacion: cleanUbicacion,
          fotoUrl: fotoUrl.trim(),
          creadoPor: userProfile?.nombre || currentUser?.email || 'Administrador',
        });
        showToast('success', 'Herramienta creada', `"${cleanDesc}" agregada con código ${cleanCodigo}.`);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm p-2.5 sm:p-4">
      <div className="min-h-full flex items-start sm:items-center justify-center py-3 sm:py-6">
        <div 
          className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xl text-zinc-100 my-auto"
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-3.5 right-3.5 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors z-10"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-4 border-b border-zinc-800/80 pb-3 pr-8">
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {toolToEdit ? 'Editar Herramienta' : 'Nueva Herramienta'}
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Registra los datos internos y la fotografía del equipo
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            {/* 1. Código Interno */}
            <div>
              <label className="block text-xs font-bold text-amber-400 sm:text-zinc-200 mb-1">
                Código Interno *
              </label>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: HR-001, EQ-104, COR-05"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-wide"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Código único interno para identificación y control de inventario.
              </p>
            </div>

          {/* 2. Descripción */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-1">
              Descripción *
            </label>
            <textarea
              rows={2}
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Taladro percutor Bosch 18V con 2 baterías de litio y maletín"
              className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
            />
          </div>

          {/* 3. Categoría y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-zinc-200 mb-1">
                Categoría *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaHerramienta)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-200 mb-1">
                Estado *
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
          </div>

          {/* 4. Ubicación */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-1">
              Ubicación *
            </label>
            <input
              type="text"
              required
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej: Estante A-2, Taller Central, Gabinete 3"
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* 5. Fotografía con Cámara del Teléfono (Sin URL) */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-zinc-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Foto de la Herramienta</span>
              </span>
              {fotoUrl && (
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  Foto adjunta
                </span>
              )}
            </label>

            {/* Hidden native camera and gallery file inputs */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleImageFileChange}
              className="hidden"
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageFileChange}
              className="hidden"
            />

            {/* Photo Preview or Capture Buttons */}
            {fotoUrl ? (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
                  <img
                    src={fotoUrl}
                    alt="Foto de la herramienta"
                    className="w-full h-full object-cover object-center"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <p className="text-xs text-zinc-300 font-medium">
                    Fotografía lista para guardarse con el registro.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={processingPhoto}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>{processingPhoto ? 'Procesando...' : 'Tomar otra foto'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 border-2 border-dashed border-zinc-700 hover:border-amber-500/50 bg-zinc-950/80 rounded-xl text-center space-y-3 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    {processingPhoto ? 'Comprimiendo y preparando foto...' : 'Capturar foto de la herramienta'}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Puedes tomarla en el instante con la cámara de tu teléfono
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={processingPhoto}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Abrir Cámara</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processingPhoto}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4 text-zinc-400" />
                    <span>Elegir Archivo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || processingPhoto}
              className="px-5 py-2 text-xs sm:text-sm font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
            >
              {loading ? (
                <span>Guardando...</span>
              ) : toolToEdit ? (
                <span>Actualizar Herramienta</span>
              ) : (
                <span>Crear Herramienta</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
};
