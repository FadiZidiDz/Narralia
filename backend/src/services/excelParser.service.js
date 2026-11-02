import * as XLSX from 'xlsx';

const MAX_ROWS = 200;

const WORD_ALIASES = new Set([
  'word', 'words', 'mot', 'mots', 'vocab', 'vocabulary', 'terme', 'term',
]);

const DEFINITION_ALIASES = new Set([
  'definition', 'definitions', 'def', 'meaning', 'definition_fr',
  'signification', 'sens',
]);

const EXAMPLE_ALIASES = new Set([
  'example', 'examples', 'sentence', 'sample', 'exemple', 'exemples', 'phrase',
]);

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function mapHeaderToField(normalized) {
  if (WORD_ALIASES.has(normalized)) return 'word';
  if (DEFINITION_ALIASES.has(normalized)) return 'definition';
  if (EXAMPLE_ALIASES.has(normalized)) return 'example';
  return null;
}

function cellToString(value) {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

function firstNonEmptyColumnIndex(row) {
  if (!Array.isArray(row)) return -1;
  for (let i = 0; i < row.length; i++) {
    if (cellToString(row[i])) return i;
  }
  return -1;
}

function buildColumnMapFromHeaders(headerRow) {
  const columnMap = {};
  if (!Array.isArray(headerRow)) return columnMap;

  headerRow.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    if (!normalized) return;
    const field = mapHeaderToField(normalized);
    if (field && columnMap[field] == null) {
      columnMap[field] = index;
    }
  });
  return columnMap;
}

function applyPositionalFallback(columnMap, headerRow) {
  const used = new Set(Object.values(columnMap));
  const candidates = [];
  if (Array.isArray(headerRow)) {
    headerRow.forEach((_, index) => {
      if (!used.has(index)) candidates.push(index);
    });
  }
  if (candidates.length === 0) {
    candidates.push(0, 1, 2);
  }
  if (columnMap.word == null) columnMap.word = candidates[0] ?? 0;
  if (columnMap.definition == null) columnMap.definition = candidates[1] ?? columnMap.word + 1;
  if (columnMap.example == null) columnMap.example = candidates[2] ?? columnMap.definition + 1;
  return columnMap;
}

/**
 * Parse first sheet of an Excel buffer into vocabulary rows.
 * Recognized headers are used when present; otherwise columns are read in order
 * (1st = word, 2nd = definition, 3rd = example). Any .xlsx/.xls table works.
 */
export function parseVocabularyExcel(buffer) {
  if (!buffer || buffer.length < 4) {
    throw new Error('File is empty or not a valid Excel workbook.');
  }

  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  } catch {
    throw new Error('Could not read Excel file. Use .xlsx or .xls format.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file has no sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

  if (!grid.length) {
    throw new Error('Excel sheet is empty.');
  }

  const headerRow = grid[0];
  let columnMap = buildColumnMapFromHeaders(headerRow);
  const hasNamedHeaders = columnMap.word != null;

  columnMap = applyPositionalFallback(columnMap, headerRow);

  // Skip row 0 only when we matched a known header label (Word, Mot, etc.)
  const dataStartRow = hasNamedHeaders ? 1 : 0;

  const rows = [];
  for (let i = dataStartRow; i < grid.length && rows.length < MAX_ROWS; i++) {
    const row = grid[i];
    if (!Array.isArray(row)) continue;

    const wordCol = columnMap.word ?? firstNonEmptyColumnIndex(row);
    if (wordCol < 0) continue;

    const word = cellToString(row[wordCol]);
    if (!word) continue;

    const definition =
      columnMap.definition != null ? cellToString(row[columnMap.definition]) : '';
    const example =
      columnMap.example != null ? cellToString(row[columnMap.example]) : '';

    rows.push({ word, definition, example });
  }

  if (rows.length === 0) {
    throw new Error('No vocabulary rows found. Put words in the first column of your sheet.');
  }

  if (grid.length - dataStartRow > MAX_ROWS) {
    return {
      rows,
      truncated: true,
      message: `Only the first ${MAX_ROWS} words were imported.`,
    };
  }

  return { rows, truncated: false };
}
