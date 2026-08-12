import * as XLSX from 'xlsx';
import type { Platform } from '../types/detachment';
import type { ComponentCategory, LSComponent, LSPlatformTemplate } from '../data/lSeriesTemplate';
import { L_SERIES_TEMPLATE } from '../data/lSeriesTemplate';

const BASE_COLUMNS = ['Category', 'NSN', 'MPN', 'Trade', 'Description', 'System', 'Variants'] as const;

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function tierHeaders(platform: Platform): string[] {
  return L_SERIES_TEMPLATE[platform].tiers.map(String);
}

export function getExpectedColumnHeaders(platform: Platform): string[] {
  return [...BASE_COLUMNS, ...tierHeaders(platform), 'UOM'];
}

function isCategory(value: string): value is ComponentCategory {
  return value === 'LRU' || value === 'Consumable' || value === 'POL';
}

function parseQty(value: unknown): number {
  if (value === '' || value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

export interface LSeriesExcelValidationResult {
  ok: true;
  template: LSPlatformTemplate;
}

export interface LSeriesExcelValidationError {
  ok: false;
  message: string;
}

export type LSeriesExcelParseResult = LSeriesExcelValidationResult | LSeriesExcelValidationError;

export function validateAndParseLSeriesWorkbook(
  workbook: XLSX.WorkBook,
  platform: Platform,
): LSeriesExcelParseResult {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { ok: false, message: 'The uploaded file has no worksheets. Delete the file and upload a valid L-series template.' };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: '' });
  if (rows.length === 0) {
    return { ok: false, message: 'The uploaded file is empty. Delete the file and upload a valid L-series template.' };
  }

  const headers = (rows[0] ?? []).map(normalizeHeader);
  const expected = getExpectedColumnHeaders(platform);

  if (headers.length !== expected.length || headers.some((header, index) => header !== expected[index])) {
    return {
      ok: false,
      message: `Column headers do not match the ${platform} L-series template. Expected: ${expected.join(', ')}. Delete the file and upload a corrected template.`,
    };
  }

  const tiers = L_SERIES_TEMPLATE[platform].tiers;
  const components: LSComponent[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const categoryRaw = normalizeHeader(row[0]);
    const nsn = normalizeHeader(row[1]);
    if (!categoryRaw && !nsn) continue;
    if (!categoryRaw || !nsn) {
      return {
        ok: false,
        message: `Row ${rowIndex + 1} is missing Category or NSN. Delete the file and fix the template before re-uploading.`,
      };
    }
    if (!isCategory(categoryRaw)) {
      return {
        ok: false,
        message: `Row ${rowIndex + 1} has an invalid Category "${categoryRaw}". Delete the file and fix the template before re-uploading.`,
      };
    }

    const qtyByTier: Record<string, number> = {};
    for (let tierIndex = 0; tierIndex < tiers.length; tierIndex += 1) {
      const tier = tiers[tierIndex];
      const qty = parseQty(row[7 + tierIndex]);
      if (Number.isNaN(qty)) {
        return {
          ok: false,
          message: `Row ${rowIndex + 1} has an invalid quantity for tier ${tier}. Delete the file and fix the template before re-uploading.`,
        };
      }
      qtyByTier[String(tier)] = qty;
    }

    const uomRaw = normalizeHeader(row[7 + tiers.length]);
    components.push({
      category: categoryRaw,
      nsn,
      mpn: normalizeHeader(row[2]),
      trade: normalizeHeader(row[3]) || undefined,
      description: normalizeHeader(row[4]),
      system: normalizeHeader(row[5]) || undefined,
      variants: normalizeHeader(row[6]) || undefined,
      qtyByTier,
      uom: uomRaw || undefined,
    });
  }

  if (components.length === 0) {
    return { ok: false, message: 'No component rows were found in the uploaded file. Delete the file and upload a valid L-series template.' };
  }

  return {
    ok: true,
    template: {
      paramLabel: L_SERIES_TEMPLATE[platform].paramLabel,
      tiers,
      components,
    },
  };
}

export async function parseLSeriesExcelFile(
  file: File,
  platform: Platform,
): Promise<LSeriesExcelParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  return validateAndParseLSeriesWorkbook(workbook, platform);
}

function templateToRows(template: LSPlatformTemplate): (string | number)[][] {
  const headers = [
    ...BASE_COLUMNS,
    ...template.tiers.map(String),
    'UOM',
  ];
  const rows: (string | number)[][] = [headers];

  for (const component of template.components) {
    rows.push([
      component.category,
      component.nsn,
      component.mpn,
      component.trade ?? '',
      component.description,
      component.system ?? '',
      component.variants ?? '',
      ...template.tiers.map((tier) => component.qtyByTier[String(tier)] ?? 0),
      component.uom ?? '',
    ]);
  }

  return rows;
}

export function downloadLSeriesWorkbook(
  filename: string,
  template: LSPlatformTemplate,
  platform: Platform,
): void {
  const rows = templateToRows(template);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  const sheetName = platform === 'F-16' ? 'F16' : 'CH47';
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export function downloadBlankLSeriesTemplate(platform: Platform): void {
  const blankTemplate: LSPlatformTemplate = {
    paramLabel: L_SERIES_TEMPLATE[platform].paramLabel,
    tiers: [...L_SERIES_TEMPLATE[platform].tiers],
    components: [],
  };
  downloadLSeriesWorkbook(`L-series-template-${platform.replace('-', '')}.xlsx`, blankTemplate, platform);
}
