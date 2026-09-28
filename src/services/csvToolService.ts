import { Herramienta, EstadoHerramienta } from '../types';

export interface CSVParseResult {
  validRows: ParsedHerramientaRow[];
  errors: { row: number; reason: string }[];
}

export interface ParsedHerramientaRow {
  codigo: string;
  nombre: string;
  categoria: string;
  marca?: string;
  modelo?: string;
  ubicacion: string;
  estado: EstadoHerramienta;
  numeroSerie?: string;
  notas?: string;
  fotoUrl?: string;
  // Conflict status against existing tools
  isExisting: boolean;
  existingId?: string;
  existingEstado?: EstadoHerramienta;
  existingPrestamoId?: string;
}

/**
 * Escapes a cell value for standard CSV compatibility (RFC 4180)
 */
const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Exports current tools list to standard CSV file (Excel-friendly with UTF-8 BOM)
 */
export const exportHerramientasToCSV = (herramientas: Herramienta[], filename?: string): void => {
  const headers = [
    'Codigo',
    'Nombre',
    'Categoria',
    'Marca',
    'Modelo',
    'NumeroSerie',
    'Estado',
    'Ubicacion',
    'Notas',
    'TecnicoAsignado',
    'FotoUrl',
  ];

  const rows = herramientas.map((h) => [
    escapeCSV(h.codigo),
    escapeCSV(h.nombre),
    escapeCSV(h.categoria),
    escapeCSV(h.marca || ''),
    escapeCSV(h.modelo || ''),
    escapeCSV(h.numeroSerie || ''),
    escapeCSV(h.estado),
    escapeCSV(h.ubicacion || 'General'),
    escapeCSV(h.notas || ''),
    escapeCSV(h.tecnicoAsignadoNombre || ''),
    escapeCSV(h.fotoUrl || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  // \uFEFF is UTF-8 Byte Order Mark so Microsoft Excel opens Spanish characters (ñ, tildes) flawlessly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', filename || `inventario_herramientas_backup_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates and downloads a clean, sample template CSV for importing tools
 */
export const downloadPlantillaCSV = (): void => {
  const headers = [
    'Codigo',
    'Nombre',
    'Categoria',
    'Marca',
    'Modelo',
    'NumeroSerie',
    'Estado',
    'Ubicacion',
    'Notas',
  ];

  const sampleRows = [
    [
      'TAL-001',
      'Taladro Percutor 13mm Inalámbrico',
      'Herramientas Eléctricas',
      'DeWalt',
      'DCD777D2',
      'SN-8827361',
      'Disponible',
      'Estante A-1',
      'Incluye 2 baterías y cargador',
    ],
    [
      'AMI-002',
      'Amoladora Angular 4-1/2 840W',
      'Corte y Desbaste',
      'Makita',
      'GA4530R',
      'SN-4491022',
      'Disponible',
      'Gabinete B',
      'Con protector de disco',
    ],
    [
      'PIN-003',
      'Pinza Amperimétrica True RMS 600V',
      'Medición y Diagnóstico',
      'Fluke',
      '323',
      'SN-9912039',
      'Disponible',
      'Cajón Instrumentación',
      'Calibración vigente',
    ],
  ];

  const csvContent = [headers.join(','), ...sampleRows.map((r) => r.map(escapeCSV).join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'plantilla_importacion_herramientas.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * RFC 4180-compliant CSV row parser supporting quotes, commas and multiple lines inside quotes
 */
export const parseCSVText = (text: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  // Clean UTF-8 BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n of \r\n
      }
      row.push(current.trim());
      // Only push non-empty rows
      if (row.some((cell) => cell.length > 0)) {
        result.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) {
      result.push(row);
    }
  }

  return result;
};

/**
 * Validates and matches parsed CSV rows against the active database tools to detect duplicates
 */
export const validateAndMapHerramientasCSV = (
  rawRows: string[][],
  existingTools: Herramienta[]
): CSVParseResult => {
  const result: CSVParseResult = {
    validRows: [],
    errors: [],
  };

  if (!rawRows || rawRows.length === 0) {
    result.errors.push({ row: 0, reason: 'El archivo CSV está completamente vacío.' });
    return result;
  }

  // Header inspection
  const headerRow = rawRows[0].map((h) => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

  // Find column indices flexibly
  const getIdx = (candidates: string[]): number => {
    return headerRow.findIndex((col) => candidates.some((cand) => col.includes(cand)));
  };

  const codigoIdx = getIdx(['codigo', 'sku', 'code', 'id']);
  const nombreIdx = getIdx(['nombre', 'descripcion', 'herramienta', 'name']);
  const categoriaIdx = getIdx(['categoria', 'rubro', 'tipo']);
  const marcaIdx = getIdx(['marca', 'brand']);
  const modeloIdx = getIdx(['modelo', 'model']);
  const serieIdx = getIdx(['serie', 'serial', 'sn']);
  const estadoIdx = getIdx(['estado', 'status']);
  const ubicacionIdx = getIdx(['ubicacion', 'estante', 'lugar', 'location']);
  const notasIdx = getIdx(['notas', 'observaciones', 'detalle', 'nota']);
  const fotoIdx = getIdx(['foto', 'imagen', 'url']);

  if (codigoIdx === -1 || nombreIdx === -1) {
    result.errors.push({
      row: 1,
      reason: 'El archivo CSV no contiene las columnas obligatorias: "Codigo" y "Nombre". Revisa la plantilla.',
    });
    return result;
  }

  // Map of existing tools by SKU/Codigo (case insensitive)
  const existingMap = new Map<string, Herramienta>();
  existingTools.forEach((tool) => {
    if (tool.codigo) {
      existingMap.set(tool.codigo.trim().toUpperCase(), tool);
    }
  });

  // Track codes inside the same CSV to prevent duplicates within the file
  const seenInCSV = new Set<string>();

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNumber = i + 1;

    // Skip empty lines
    if (!row || row.every((c) => !c || c.trim() === '')) {
      continue;
    }

    const rawCodigo = (row[codigoIdx] || '').trim();
    const rawNombre = (row[nombreIdx] || '').trim();

    if (!rawCodigo) {
      result.errors.push({ row: rowNumber, reason: 'El campo "Codigo" está vacío.' });
      continue;
    }

    if (!rawNombre) {
      result.errors.push({ row: rowNumber, reason: `La herramienta "${rawCodigo}" no tiene nombre/descripción.` });
      continue;
    }

    const normalizedCode = rawCodigo.toUpperCase();
    if (seenInCSV.has(normalizedCode)) {
      result.errors.push({
        row: rowNumber,
        reason: `El código "${rawCodigo}" está duplicado más de una vez dentro de la misma planilla.`,
      });
      continue;
    }
    seenInCSV.add(normalizedCode);

    // Validate category
    const rawCategoria = categoriaIdx !== -1 && row[categoriaIdx] ? row[categoriaIdx].trim() : 'Herramientas Manuales';

    // Validate Estado
    let estadoParsed: EstadoHerramienta = 'Disponible';
    if (estadoIdx !== -1 && row[estadoIdx]) {
      const eStr = row[estadoIdx].toLowerCase();
      if (eStr.includes('prest') || eStr.includes('uso')) {
        estadoParsed = 'Prestada';
      } else if (eStr.includes('mantenimiento') || eStr.includes('reparaci')) {
        estadoParsed = 'En Mantenimiento';
      } else if (eStr.includes('baja') || eStr.includes('fuera') || eStr.includes('dan')) {
        estadoParsed = 'Fuera de servicio';
      }
    }

    // Check conflict with database
    const existing = existingMap.get(normalizedCode);

    result.validRows.push({
      codigo: rawCodigo,
      nombre: rawNombre,
      categoria: rawCategoria,
      marca: marcaIdx !== -1 && row[marcaIdx] ? row[marcaIdx].trim() : undefined,
      modelo: modeloIdx !== -1 && row[modeloIdx] ? row[modeloIdx].trim() : undefined,
      numeroSerie: serieIdx !== -1 && row[serieIdx] ? row[serieIdx].trim() : undefined,
      ubicacion: ubicacionIdx !== -1 && row[ubicacionIdx] ? row[ubicacionIdx].trim() : 'Almacén Central',
      notas: notasIdx !== -1 && row[notasIdx] ? row[notasIdx].trim() : undefined,
      fotoUrl: fotoIdx !== -1 && row[fotoIdx] ? row[fotoIdx].trim() : undefined,
      estado: estadoParsed,
      isExisting: Boolean(existing),
      existingId: existing?.id,
      existingEstado: existing?.estado,
      existingPrestamoId: existing?.prestamoActualId,
    });
  }

  return result;
};
