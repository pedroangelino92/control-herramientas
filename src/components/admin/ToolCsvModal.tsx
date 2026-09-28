import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  Archive,
  Image as ImageIcon,
  Camera,
  FolderArchive,
  Sparkles,
  Check,
  RefreshCw,
  HardDrive,
  History,
  Clock
} from 'lucide-react';
import { Herramienta, RegistroAuditoria } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  downloadPlantillaCSV, 
  exportHerramientasToCSV, 
  parseCSVText, 
  validateAndMapHerramientasCSV, 
  ParsedHerramientaRow 
} from '../../services/csvToolService';
import { 
  processZipPhotos, 
  processLoosePhotos, 
  exportToolPhotosZip, 
  ProcessedPhotoItem 
} from '../../services/photoZipService';
import { 
  bulkImportHerramientas, 
  bulkUpdateToolPhotos, 
  registrarAuditoria,
  subscribeToAuditoria
} from '../../services/toolService';

interface ToolCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  herramientas: Herramienta[];
}

export const ToolCsvModal: React.FC<ToolCsvModalProps> = ({
  isOpen,
  onClose,
  herramientas,
}) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);
  const looseFilesInputRef = useRef<HTMLInputElement>(null);

  // Tabs: import (CSV), export (CSV), photos (ZIP or multiple files)
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'photos'>('import');

  // CSV State
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [isCsvParsing, setIsCsvParsing] = useState(false);
  const [csvParseErrors, setCsvParseErrors] = useState<{ row: number; reason: string }[]>([]);
  const [validCsvRows, setValidCsvRows] = useState<ParsedHerramientaRow[]>([]);
  const [conflictStrategy, setConflictStrategy] = useState<'skip' | 'update'>('skip');
  const [isCsvSubmitting, setIsCsvSubmitting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    updated: number;
    skipped: number;
  } | null>(null);

  // Photos (ZIP / Loose) State
  const [photoImportType, setPhotoImportType] = useState<'zip' | 'loose'>('zip');
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoProgress, setPhotoProgress] = useState<{ current: number; total: number } | null>(null);
  const [processedPhotos, setProcessedPhotos] = useState<ProcessedPhotoItem[]>([]);
  const [isSavingPhotos, setIsSavingPhotos] = useState(false);
  const [isExportingPhotosZip, setIsExportingPhotosZip] = useState(false);
  const [photoSaveSummary, setPhotoSaveSummary] = useState<{ updated: number } | null>(null);
  const [auditoriaLogs, setAuditoriaLogs] = useState<RegistroAuditoria[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToAuditoria((logs) => {
      setAuditoriaLogs(logs);
    }, 15);
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const resetAll = () => {
    setSelectedCsvFile(null);
    setCsvParseErrors([]);
    setValidCsvRows([]);
    setImportSummary(null);
    setProcessedPhotos([]);
    setPhotoProgress(null);
    setPhotoSaveSummary(null);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    if (zipFileInputRef.current) zipFileInputRef.current.value = '';
    if (looseFilesInputRef.current) looseFilesInputRef.current.value = '';
  };

  // CSV Handlers
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('error', 'Formato no soportado', 'Por favor selecciona un archivo con extensión .csv');
      return;
    }

    setSelectedCsvFile(file);
    setImportSummary(null);
    setCsvParseErrors([]);
    setValidCsvRows([]);
    parseCsvFile(file);
  };

  const parseCsvFile = (file: File) => {
    setIsCsvParsing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rawGrid = parseCSVText(text);
        const { validRows, errors } = validateAndMapHerramientasCSV(rawGrid, herramientas);

        setValidCsvRows(validRows);
        setCsvParseErrors(errors);

        if (validRows.length === 0 && errors.length > 0) {
          showToast('error', 'Planilla inválida', errors[0].reason);
        } else if (errors.length > 0) {
          showToast('warning', 'Planilla con advertencias', `${validRows.length} herramientas válidas y ${errors.length} con errores.`);
        } else {
          showToast('success', 'Planilla validada', `${validRows.length} herramientas listas para importar.`);
        }
      } catch (err: any) {
        showToast('error', 'Error al leer archivo', err.message || 'Formato CSV ilegible.');
      } finally {
        setIsCsvParsing(false);
      }
    };

    reader.onerror = () => {
      setIsCsvParsing(false);
      showToast('error', 'Error', 'No se pudo leer el archivo seleccionado.');
    };

    reader.readAsText(file, 'utf-8');
  };

  const handleExecuteCsvImport = async () => {
    if (validCsvRows.length === 0) return;
    setIsCsvSubmitting(true);

    try {
      const result = await bulkImportHerramientas(
        validCsvRows,
        conflictStrategy,
        currentUser?.uid || 'admin'
      );

      setImportSummary(result);
      
      // Registrar en la auditoría del almacén
      await registrarAuditoria({
        tipo: 'importacion_masiva_csv',
        usuarioUid: currentUser?.uid || 'admin',
        usuarioEmail: currentUser?.email || 'admin@sistema.com',
        usuarioNombre: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrador',
        detalles: `Importación masiva CSV: ${result.created} herramientas nuevas, ${result.updated} actualizadas, ${result.skipped} omitidas.`,
        totalElementos: result.created + result.updated,
        metadata: {
          estrategiaConflicto: conflictStrategy,
          archivo: selectedCsvFile?.name || 'inventario.csv',
          ...result
        }
      });

      showToast(
        'success',
        '¡Importación Masiva Completada!',
        `Se crearon ${result.created} herramientas nuevas, se actualizaron ${result.updated} y se omitieron ${result.skipped}.`
      );
    } catch (err: any) {
      console.error('Error importing tools:', err);
      showToast('error', 'Error en la importación', err.message || 'Error al guardar en Firestore.');
    } finally {
      setIsCsvSubmitting(false);
    }
  };

  // Photo ZIP Handlers
  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      showToast('error', 'Formato no soportado', 'Por favor selecciona un archivo comprimido .zip (ej. fotos.zip)');
      return;
    }

    setIsProcessingPhotos(true);
    setPhotoSaveSummary(null);
    setProcessedPhotos([]);

    try {
      const results = await processZipPhotos(file, herramientas, (current, total) => {
        setPhotoProgress({ current, total });
      });

      setProcessedPhotos(results);
      const matched = results.filter((r) => r.toolFound && !r.error).length;
      showToast('success', 'ZIP Procesado', `Se extrajeron ${results.length} fotos comprimidas. ${matched} coinciden con herramientas.`);
    } catch (err: any) {
      console.error('Error processing zip:', err);
      showToast('error', 'Error con el archivo ZIP', err.message || 'No se pudo procesar el archivo ZIP.');
    } finally {
      setIsProcessingPhotos(false);
      setPhotoProgress(null);
      if (e.target) e.target.value = '';
    }
  };

  // Loose Multiple Photos Handlers
  const handleLooseFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setIsProcessingPhotos(true);
    setPhotoSaveSummary(null);
    setProcessedPhotos([]);

    try {
      const results = await processLoosePhotos(fileList, herramientas, (current, total) => {
        setPhotoProgress({ current, total });
      });

      setProcessedPhotos(results);
      const matched = results.filter((r) => r.toolFound && !r.error).length;
      showToast('success', 'Fotos analizadas', `Se procesaron y comprimieron ${results.length} imágenes. ${matched} coinciden.`);
    } catch (err: any) {
      console.error('Error processing loose photos:', err);
      showToast('error', 'Error con las imágenes', err.message || 'No se pudieron procesar las fotos.');
    } finally {
      setIsProcessingPhotos(false);
      setPhotoProgress(null);
      if (e.target) e.target.value = '';
    }
  };

  // Save matched photos to Firestore
  const handleSavePhotosToFirestore = async () => {
    const matchedItems = processedPhotos.filter((p) => p.toolFound && p.toolId && p.dataUrl);
    if (matchedItems.length === 0) return;

    setIsSavingPhotos(true);
    try {
      const updates = matchedItems.map((p) => ({
        toolId: p.toolId!,
        fotoUrl: p.dataUrl!,
      }));

      const count = await bulkUpdateToolPhotos(updates);
      setPhotoSaveSummary({ updated: count });

      // Registrar auditoría de actualización masiva de fotos
      await registrarAuditoria({
        tipo: 'importacion_masiva_fotos',
        usuarioUid: currentUser?.uid || 'admin',
        usuarioEmail: currentUser?.email || 'admin@sistema.com',
        usuarioNombre: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrador',
        detalles: `Asignación masiva de fotos: ${count} herramientas actualizadas con fotos comprimidas.`,
        totalElementos: count,
        metadata: {
          modo: photoImportType,
          totalProcesadas: processedPhotos.length
        }
      });

      showToast('success', '¡Fotos actualizadas!', `Se guardaron ${count} fotos de herramientas comprimidas a calidad ligera.`);
    } catch (err: any) {
      console.error('Error saving photos:', err);
      showToast('error', 'Error al guardar fotos', err.message || 'Error en Firestore.');
    } finally {
      setIsSavingPhotos(false);
    }
  };

  // Export all tool photos as fotos_herramientas.zip
  const handleExportPhotosZip = async () => {
    setIsExportingPhotosZip(true);
    try {
      const zipBlob = await exportToolPhotosZip(herramientas);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fotos_herramientas_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Registrar auditoría de exportación de fotos
      await registrarAuditoria({
        tipo: 'exportacion_backup_fotos',
        usuarioUid: currentUser?.uid || 'admin',
        usuarioEmail: currentUser?.email || 'admin@sistema.com',
        usuarioNombre: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrador',
        detalles: `Backup de fotos exportado en ZIP: ${toolsWithPhotosCount} fotos empaquetadas.`,
        totalElementos: toolsWithPhotosCount,
      });

      showToast('success', 'ZIP Generado', 'Se descargó el archivo ZIP con las fotos nombradas con sus códigos.');
    } catch (err: any) {
      showToast('error', 'Exportación fallida', err.message || 'No se pudieron exportar las fotos.');
    } finally {
      setIsExportingPhotosZip(false);
    }
  };

  const newCsvCount = validCsvRows.filter((r) => !r.isExisting).length;
  const existingCsvCount = validCsvRows.filter((r) => r.isExisting).length;
  const toolsWithPhotosCount = herramientas.filter((h) => Boolean(h.fotoUrl)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                Gestión Masiva: Planilla y Fotos de Herramientas
              </h3>
              <p className="text-[11px] text-zinc-400">
                Importación y exportación masiva con compresión automática para cuidar Firebase
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              resetAll();
              onClose();
            }}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector - 3 equal columns on mobile so all 3 fit without scrolling */}
        <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-950/60 p-1.5 gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'import'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs leading-tight">Importar CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'export'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs leading-tight">Backup CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'photos'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] sm:text-xs leading-tight">Fotos ZIP</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* ============================================================== */}
          {/* TAB 1: IMPORT CSV */}
          {/* ============================================================== */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Paso 1: Descarga la plantilla oficial
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Columnas: Código, Nombre, Categoría, Marca, Modelo, Serie, Ubicación y Notas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={downloadPlantillaCSV}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all border border-zinc-700 shrink-0 flex items-center gap-1.5 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bajar Plantilla CSV</span>
                </button>
              </div>

              <div
                onClick={() => csvFileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-amber-500/70 bg-zinc-950/60 hover:bg-amber-500/5 p-6 rounded-2xl cursor-pointer text-center transition-all group"
              >
                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvFileChange}
                />

                <div className="w-12 h-12 rounded-2xl bg-zinc-900 group-hover:bg-amber-500/20 text-zinc-400 group-hover:text-amber-400 border border-zinc-800 mx-auto flex items-center justify-center transition-colors mb-2">
                  <Upload className="w-6 h-6" />
                </div>

                <p className="text-xs font-bold text-white">
                  {selectedCsvFile ? selectedCsvFile.name : 'Haz clic aquí para seleccionar tu archivo CSV'}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Compatible con Excel y Google Sheets (Guardar como CSV UTF-8)
                </p>
              </div>

              {isCsvParsing && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center gap-2 text-xs text-amber-300">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Verificando códigos y duplicados...</span>
                </div>
              )}

              {validCsvRows.length > 0 && !importSummary && (
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Planilla analizada: {validCsvRows.length} herramientas válidas
                    </span>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                        {newCsvCount} Nuevas
                      </span>
                      {existingCsvCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                          {existingCsvCount} Ya existen
                        </span>
                      )}
                    </div>
                  </div>

                  {existingCsvCount > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-300">
                            Se detectaron {existingCsvCount} códigos ya registrados en el almacén:
                          </p>
                          <p className="text-[11px] text-zinc-300 mt-0.5">
                            ¿Qué deseas hacer para proteger tu inventario?
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                          conflictStrategy === 'skip'
                            ? 'bg-amber-500/20 border-amber-500/60 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}>
                          <input
                            type="radio"
                            name="conflict"
                            value="skip"
                            checked={conflictStrategy === 'skip'}
                            onChange={() => setConflictStrategy('skip')}
                            className="mt-0.5 accent-amber-500"
                          />
                          <div>
                            <span className="font-bold block text-xs">Omitir (Recomendado)</span>
                            <span className="text-[10px] text-zinc-400 block leading-tight mt-0.5">
                              No sobreescribe herramientas existentes ni altera préstamos.
                            </span>
                          </div>
                        </label>

                        <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                          conflictStrategy === 'update'
                            ? 'bg-amber-500/20 border-amber-500/60 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}>
                          <input
                            type="radio"
                            name="conflict"
                            value="update"
                            checked={conflictStrategy === 'update'}
                            onChange={() => setConflictStrategy('update')}
                            className="mt-0.5 accent-amber-500"
                          />
                          <div>
                            <span className="font-bold block text-xs">Actualizar datos</span>
                            <span className="text-[10px] text-zinc-400 block leading-tight mt-0.5">
                              Actualiza especificaciones técnicas sin alterar préstamos activos.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {csvParseErrors.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        {csvParseErrors.length} filas con error fueron ignoradas:
                      </p>
                      <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-zinc-300 max-h-24 overflow-y-auto">
                        {csvParseErrors.map((err, idx) => (
                          <li key={idx}>
                            Fila {err.row}: {err.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCsvFile(null);
                        setValidCsvRows([]);
                      }}
                      disabled={isCsvSubmitting}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleExecuteCsvImport}
                      disabled={isCsvSubmitting || validCsvRows.length === 0}
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      {isCsvSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Guardando en Firestore...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Importar Planilla</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {importSummary && (
                <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">¡Planilla Importada con Éxito!</h4>
                    <p className="text-xs text-emerald-300/90 mt-1">
                      El inventario fue actualizado en tiempo real.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto text-xs py-2">
                    <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Nuevas creadas</span>
                      <strong className="text-base text-emerald-400 font-black">{importSummary.created}</strong>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Actualizadas</span>
                      <strong className="text-base text-amber-400 font-black">{importSummary.updated}</strong>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Omitidas</span>
                      <strong className="text-base text-zinc-400 font-black">{importSummary.skipped}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      resetAll();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md"
                  >
                    Aceptar y Ver Inventario
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: EXPORT CSV */}
          {/* ============================================================== */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      Exportar Copia de Seguridad Completa (CSV)
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      Genera un archivo compatible con Excel con todos los datos técnicos del inventario y técnicos asignados.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-800">
                  <span className="text-[11px] text-zinc-400">
                    Total a exportar: <strong className="text-white">{herramientas.length} registros</strong>
                  </span>

                  <button
                    type="button"
                    onClick={async () => {
                      exportHerramientasToCSV(herramientas);
                      await registrarAuditoria({
                        tipo: 'exportacion_backup_csv',
                        usuarioUid: currentUser?.uid || 'admin',
                        usuarioEmail: currentUser?.email || 'admin@sistema.com',
                        usuarioNombre: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrador',
                        detalles: `Backup CSV generado con ${herramientas.length} herramientas registradas.`,
                        totalElementos: herramientas.length,
                      });
                      showToast('success', 'Descarga iniciada', 'Copia de respaldo generada.');
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Planilla CSV</span>
                  </button>
                </div>
              </div>

              {/* Registro de Auditoría de Cargas y Respaldos */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      Historial de Auditoría Masiva Reciente
                    </h4>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-semibold">
                    {auditoriaLogs.length} eventos registrados
                  </span>
                </div>

                {auditoriaLogs.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic py-2 text-center bg-zinc-900/40 rounded-xl border border-zinc-850">
                    Aún no hay operaciones masivas registradas en la auditoría.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {auditoriaLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span className="font-bold text-amber-400">
                            {log.usuarioNombre} ({log.usuarioEmail})
                          </span>
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Clock className="w-3 h-3" />
                            {new Date(log.fecha).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-zinc-200 text-[11px] leading-tight">
                          {log.detalles}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: FOTOS POR CÓDIGO (ZIP O MÚLTIPLES) CON COMPRESIÓN */}
          {/* ============================================================== */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              {/* Recommendation banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>¿Cómo funciona la asignación automática por código?</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Solo debes nombrar tus fotos con el código exacto de la herramienta (ej: <code className="text-emerald-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">B-001.jpg</code>, <code className="text-emerald-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">TAL-002.png</code>).
                  El sistema las comprime automáticamente en el navegador a <strong>menos de 80 KB</strong> antes de subirlas a Firebase, ahorrando el 95% de espacio y acelerando la app.
                </p>
              </div>

              {/* Mode Selector: ZIP file OR Multiple Loose Photos */}
              <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPhotoImportType('zip')}
                  className={`py-2 px-2 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-center ${
                    photoImportType === 'zip'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] sm:text-xs">fotos.zip (Recomendado)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoImportType('loose')}
                  className={`py-2 px-2 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-center ${
                    photoImportType === 'loose'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] sm:text-xs">Fotos sueltas</span>
                </button>
              </div>

              {/* Upload Drop Zone for ZIP */}
              {photoImportType === 'zip' && (
                <div
                  onClick={() => zipFileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-zinc-950/60 hover:bg-emerald-500/5 p-6 rounded-2xl cursor-pointer text-center transition-all group"
                >
                  <input
                    ref={zipFileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleZipFileChange}
                  />

                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 group-hover:bg-emerald-500/20 text-zinc-400 group-hover:text-emerald-400 border border-zinc-800 mx-auto flex items-center justify-center transition-colors mb-2">
                    <FolderArchive className="w-6 h-6" />
                  </div>

                  <p className="text-xs font-bold text-white">
                    Haz clic para cargar tu archivo "fotos.zip"
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Crea un archivo ZIP que contenga todas las fotos nombradas como CODIGO.jpg
                  </p>
                </div>
              )}

              {/* Upload Drop Zone for Loose Files */}
              {photoImportType === 'loose' && (
                <div
                  onClick={() => looseFilesInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-zinc-950/60 hover:bg-emerald-500/5 p-6 rounded-2xl cursor-pointer text-center transition-all group"
                >
                  <input
                    ref={looseFilesInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleLooseFilesChange}
                  />

                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 group-hover:bg-emerald-500/20 text-zinc-400 group-hover:text-emerald-400 border border-zinc-800 mx-auto flex items-center justify-center transition-colors mb-2">
                    <ImageIcon className="w-6 h-6" />
                  </div>

                  <p className="text-xs font-bold text-white">
                    Selecciona una o múltiples fotos desde tu carpeta
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Puedes seleccionar 10, 20 o 50 imágenes a la vez con Ctrl+Clic o arrastrándolas
                  </p>
                </div>
              )}

              {/* Processing Spinner / Progress */}
              {isProcessingPhotos && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center gap-2 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span className="font-bold">Comprimiendo y vinculando imágenes a códigos de herramientas...</span>
                  </div>
                  {photoProgress && (
                    <span className="text-[11px] text-zinc-400">
                      Procesando {photoProgress.current} de {photoProgress.total} imágenes
                    </span>
                  )}
                </div>
              )}

              {/* Processed Photos List & Matching Result */}
              {processedPhotos.length > 0 && !photoSaveSummary && (
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        {processedPhotos.length} fotos procesadas
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                        {processedPhotos.filter((p) => p.toolFound).length} Coinciden con el inventario
                      </span>
                      {processedPhotos.filter((p) => !p.toolFound).length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                          {processedPhotos.filter((p) => !p.toolFound).length} Código no existe
                        </span>
                      )}
                    </div>
                  </div>

                  {/* List preview of matched photos */}
                  <div className="max-h-56 overflow-y-auto space-y-1.5 border border-zinc-800/80 rounded-xl p-2 bg-zinc-900/60">
                    {processedPhotos.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                          item.toolFound
                            ? 'bg-zinc-900 border-zinc-800'
                            : 'bg-rose-950/20 border-rose-900/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.dataUrl ? (
                            <img
                              src={item.dataUrl}
                              alt={item.matchedCode}
                              className="w-8 h-8 rounded-lg object-cover bg-zinc-950 border border-zinc-800 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-4 h-4 text-zinc-500" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-bold text-white truncate text-[11px]">
                              {item.filename} ➔ Código: <strong className="text-amber-400">{item.matchedCode}</strong>
                            </p>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {item.toolFound ? (
                                <span className="text-emerald-400">
                                  ✓ Herramienta: {item.toolNombre} {item.hasExistingPhoto && '(Reemplazará foto actual)'}
                                </span>
                              ) : (
                                <span className="text-rose-400">
                                  ✕ No existe herramienta con código "{item.matchedCode}"
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right pl-2">
                          <span className="text-[10px] text-zinc-500 block">
                            {item.sizeKb > 0 ? `${item.sizeKb} KB` : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save button */}
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setProcessedPhotos([])}
                      disabled={isSavingPhotos}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
                    >
                      Descartar
                    </button>

                    <button
                      type="button"
                      onClick={handleSavePhotosToFirestore}
                      disabled={isSavingPhotos || processedPhotos.filter((p) => p.toolFound).length === 0}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      {isSavingPhotos ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Guardando fotos en Firebase...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            Guardar {processedPhotos.filter((p) => p.toolFound).length} Fotos Coincidentes
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Photos Success Summary */}
              {photoSaveSummary && (
                <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">¡Fotos Guardadas Exitosamente!</h4>
                    <p className="text-xs text-emerald-300/90 mt-1">
                      Se actualizaron {photoSaveSummary.updated} herramientas con sus fotos comprimidas de forma óptima.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      resetAll();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md"
                  >
                    Aceptar y Ver Inventario
                  </button>
                </div>
              )}

              {/* Export tool photos as ZIP */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs pt-3">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-1.5">
                    <Archive className="w-3.5 h-3.5 text-emerald-400" />
                    Exportar Backup de Fotos en un ZIP
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Descarga todas las fotos actuales empaquetadas como <code className="text-zinc-300">[CODIGO].jpg</code> en un archivo ZIP.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportPhotosZip}
                  disabled={isExportingPhotosZip || toolsWithPhotosCount === 0}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all border border-zinc-700 shrink-0 flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isExportingPhotosZip ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Empaquetando ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Descargar Fotos ZIP ({toolsWithPhotosCount})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
