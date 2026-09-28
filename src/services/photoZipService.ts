/**
 * Service to handle image compression, ZIP import, ZIP export and loose files photo matching.
 * Compresses images to ~50-90KB JPEG to avoid saturating Firestore 1MB document limit.
 */
import JSZip from 'jszip';
import { Herramienta } from '../types';

/**
 * Compresses an image blob or file to a lightweight JPEG Data URL (approx 60-100KB)
 * Max dimensions: 800x800, quality: 0.72 JPEG
 */
export const compressImageToDataUrl = (
  blob: Blob,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.72
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;

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

        // Draw white background in case of PNG transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.readAsDataURL(blob);
  });
};

/**
 * Extracts clean tool code from filename.
 * Examples:
 *  "B-001.jpg" -> "B-001"
 *  "TAL_02.JPEG" -> "TAL_02"
 *  "pinza-09.png" -> "PINZA-09"
 */
export const extractCodeFromFilename = (filename: string): string => {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  // Remove possible folder paths if inside a zip directory
  const cleanName = nameWithoutExt.split(/[\/\\]/).pop() || nameWithoutExt;
  return cleanName.trim().toUpperCase();
};

export interface ProcessedPhotoItem {
  filename: string;
  matchedCode: string;
  toolFound: boolean;
  toolId?: string;
  toolNombre?: string;
  hasExistingPhoto?: boolean;
  dataUrl?: string;
  sizeKb: number;
  error?: string;
}

/**
 * Processes a ZIP file (e.g. "fotos.zip") containing tool pictures
 */
export const processZipPhotos = async (
  zipFile: File,
  herramientas: Herramienta[],
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedPhotoItem[]> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);

  // Map tools by uppercase normalized code
  const toolMap = new Map<string, Herramienta>();
  herramientas.forEach((h) => {
    if (h.codigo) {
      toolMap.set(h.codigo.trim().toUpperCase(), h);
    }
  });

  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const imageEntries: Array<{ name: string; file: JSZip.JSZipObject }> = [];

  loadedZip.forEach((relativePath, file) => {
    if (file.dir) return;
    const lower = relativePath.toLowerCase();
    // Exclude MacOS metadata files like __MACOSX/
    if (lower.includes('__macosx') || lower.startsWith('.')) return;
    if (validExtensions.some((ext) => lower.endsWith(ext))) {
      imageEntries.push({ name: relativePath, file });
    }
  });

  const results: ProcessedPhotoItem[] = [];
  const total = imageEntries.length;

  for (let i = 0; i < total; i++) {
    const entry = imageEntries[i];
    const code = extractCodeFromFilename(entry.name);
    const matchedTool = toolMap.get(code);

    try {
      const blob = await entry.file.async('blob');
      const compressedDataUrl = await compressImageToDataUrl(blob, 800, 800, 0.72);
      const sizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

      results.push({
        filename: entry.name.split(/[\/\\]/).pop() || entry.name,
        matchedCode: code,
        toolFound: Boolean(matchedTool),
        toolId: matchedTool?.id,
        toolNombre: matchedTool?.nombre,
        hasExistingPhoto: Boolean(matchedTool?.fotoUrl),
        dataUrl: compressedDataUrl,
        sizeKb,
      });
    } catch (err: any) {
      results.push({
        filename: entry.name,
        matchedCode: code,
        toolFound: Boolean(matchedTool),
        sizeKb: 0,
        error: err.message || 'Error al comprimir',
      });
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
};

/**
 * Processes loose image files (single or multiple) selected by the user
 */
export const processLoosePhotos = async (
  files: File[],
  herramientas: Herramienta[],
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedPhotoItem[]> => {
  const toolMap = new Map<string, Herramienta>();
  herramientas.forEach((h) => {
    if (h.codigo) {
      toolMap.set(h.codigo.trim().toUpperCase(), h);
    }
  });

  const results: ProcessedPhotoItem[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const code = extractCodeFromFilename(file.name);
    const matchedTool = toolMap.get(code);

    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 800, 800, 0.72);
      const sizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

      results.push({
        filename: file.name,
        matchedCode: code,
        toolFound: Boolean(matchedTool),
        toolId: matchedTool?.id,
        toolNombre: matchedTool?.nombre,
        hasExistingPhoto: Boolean(matchedTool?.fotoUrl),
        dataUrl: compressedDataUrl,
        sizeKb,
      });
    } catch (err: any) {
      results.push({
        filename: file.name,
        matchedCode: code,
        toolFound: Boolean(matchedTool),
        sizeKb: 0,
        error: err.message || 'Error al comprimir',
      });
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
};

/**
 * Exports all existing tool photos packaged in a "fotos_herramientas.zip"
 * Each photo is named "[CODIGO].jpg"
 */
export const exportToolPhotosZip = async (
  herramientas: Herramienta[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> => {
  const zip = new JSZip();
  const toolsWithPhotos = herramientas.filter((h) => h.fotoUrl && h.fotoUrl.startsWith('data:image'));

  const total = toolsWithPhotos.length;
  if (total === 0) {
    throw new Error('No hay herramientas con fotos guardadas para exportar.');
  }

  for (let i = 0; i < total; i++) {
    const tool = toolsWithPhotos[i];
    const cleanCode = tool.codigo ? tool.codigo.trim().replace(/[\/\\:*?"<>|]/g, '_') : `TOOL_${i}`;
    const filename = `${cleanCode}.jpg`;

    // Extract base64 data
    const parts = tool.fotoUrl!.split(',');
    const base64Data = parts[1] || parts[0];

    zip.file(filename, base64Data, { base64: true });

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
};
