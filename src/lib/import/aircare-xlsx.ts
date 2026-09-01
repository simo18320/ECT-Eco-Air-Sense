import ExcelJS from "exceljs";

/**
 * Parser for AirCare / Ionex (ionex.aircare.it) XLSX exports.
 *
 * Real export structure (inspected 2026-09-01 against energy_data-analysis.xlsx):
 * - One sheet per (monitoring point, parameter) pair, named "<POINT CODE> - <Parameter>"
 *   e.g. "IAQ 01 - Co2". A non-matching "Overall Graph" chart sheet is present and ignored.
 * - Row 1: title cell "<POINT CODE> - <Parameter> - <unit>" (unit is embedded here, not in the header row).
 * - Row 2: blank.
 * - Row 3: header ['data', 'valore', <blank>, <blank>, 'MAX', 'MIN', 'AVG'].
 * - Row 4+: one row per reading — data (timestamp "DD/MM/YYYY HH:mm", confirmed UTC), valore (number),
 *   two blank spacer columns, then MAX/MIN/AVG period aggregates (recomputed by this app from stored
 *   measurements instead of trusted from the file, since their per-row placement for a multi-row export
 *   hasn't been observed yet).
 *
 * New parameter sheets (H2S, O3, formaldehyde, ...) map automatically via PARAMETER_MAP with a
 * pass-through fallback, so the importer needs no code change to support a new AirCare parameter.
 */

export type CanonicalParameter =
  | "co2"
  | "relative_humidity"
  | "pm10"
  | "pm2_5"
  | "temperature"
  | "tvoc"
  | (string & {});

export type ParsedRow = {
  pointCode: string;
  parameter: CanonicalParameter;
  sourceLabel: string;
  unit: string;
  timestamp: Date;
  value: number;
  sheetName: string;
  rowNumber: number;
};

export type RejectedRow = {
  sheetName: string;
  rowNumber: number;
  errorType: "invalid_timestamp" | "invalid_value" | "impossible_value";
  message: string;
  raw: { data: unknown; valore: unknown };
};

export type ParseResult = {
  rows: ParsedRow[];
  rejected: RejectedRow[];
  skippedSheets: { name: string; reason: string }[];
  pointCodes: string[];
  parametersDetected: string[];
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  mappingUsed: Record<string, { parameter: string; unit: string }>;
};

const PARAMETER_MAP: Record<string, { parameter: CanonicalParameter; unit: string }> = {
  co2: { parameter: "co2", unit: "ppm" },
  humidity: { parameter: "relative_humidity", unit: "%" },
  pm10: { parameter: "pm10", unit: "µg/m³" },
  pm25: { parameter: "pm2_5", unit: "µg/m³" },
  temperature: { parameter: "temperature", unit: "°C" },
  voc: { parameter: "tvoc", unit: "µg/m³" },
};

// Hard bounds: outside these, a value is physically impossible and the row is rejected.
// Soft bounds live in src/lib/import/data-quality.ts as anomaly flags on already-imported data.
const HARD_BOUNDS: Partial<Record<CanonicalParameter, [number, number]>> = {
  relative_humidity: [0, 100],
  co2: [0, 100000],
  pm10: [0, 10000],
  pm2_5: [0, 10000],
  tvoc: [0, 500000],
  temperature: [-40, 90],
};

const SHEET_NAME_PATTERN = /^(.+?)\s*-\s*([A-Za-z0-9]+)$/;
const TIMESTAMP_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/;

function parseAircareTimestamp(raw: unknown): Date | null {
  if (raw instanceof Date) return raw;
  if (typeof raw !== "string") return null;
  const m = TIMESTAMP_PATTERN.exec(raw.trim());
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min] = m;
  const day = Number(dd);
  const month = Number(mm);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Confirmed UTC per portal export behavior.
  const date = new Date(Date.UTC(Number(yyyy), month - 1, day, Number(hh), Number(min)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeParamKey(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mapParameter(label: string): { parameter: CanonicalParameter; unit: string } {
  const key = normalizeParamKey(label);
  return PARAMETER_MAP[key] ?? { parameter: key, unit: "" };
}

function extractUnitFromTitle(title: string | undefined, fallbackLabel: string): string {
  if (!title) return "";
  // Title looks like "IAQ 01 - Co2 - ppm" — the unit is everything after the parameter label's dash.
  const idx = title.lastIndexOf(` - ${fallbackLabel}`);
  if (idx === -1) {
    const parts = title.split(" - ");
    return parts.length >= 3 ? parts[parts.length - 1].trim() : "";
  }
  return title.slice(idx + ` - ${fallbackLabel}`.length).replace(/^-\s*/, "").trim();
}

export async function parseAircareWorkbook(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const rows: ParsedRow[] = [];
  const rejected: RejectedRow[] = [];
  const skippedSheets: { name: string; reason: string }[] = [];
  const pointCodes = new Set<string>();
  const parametersDetected = new Set<string>();
  const mappingUsed: Record<string, { parameter: string; unit: string }> = {};
  let dateRangeStart: Date | null = null;
  let dateRangeEnd: Date | null = null;

  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name;
    const match = SHEET_NAME_PATTERN.exec(sheetName);
    if (!match) {
      skippedSheets.push({ name: sheetName, reason: "Sheet name doesn't match '<point> - <parameter>' pattern" });
      continue;
    }
    const [, pointCode, paramLabel] = match;

    // Locate the header row (contains 'data' / 'valore') within the first few rows —
    // tolerates minor formatting drift instead of hard-coding row 3.
    let headerRowNumber = -1;
    for (let r = 1; r <= Math.min(6, worksheet.rowCount); r++) {
      const row = worksheet.getRow(r);
      const c1 = String(row.getCell(1).value ?? "").trim().toLowerCase();
      const c2 = String(row.getCell(2).value ?? "").trim().toLowerCase();
      if (c1 === "data" && c2 === "valore") {
        headerRowNumber = r;
        break;
      }
    }
    if (headerRowNumber === -1) {
      skippedSheets.push({ name: sheetName, reason: "No 'data'/'valore' header row found" });
      continue;
    }

    const titleCell = String(worksheet.getRow(1).getCell(1).value ?? "");
    const { parameter, unit: mappedUnit } = mapParameter(paramLabel);
    const unit = mappedUnit || extractUnitFromTitle(titleCell, paramLabel);
    mappingUsed[sheetName] = { parameter, unit };
    pointCodes.add(pointCode);
    parametersDetected.add(parameter);

    const lastRow = worksheet.rowCount;
    for (let r = headerRowNumber + 1; r <= lastRow; r++) {
      const row = worksheet.getRow(r);
      const rawTimestamp = row.getCell(1).value;
      const rawValue = row.getCell(2).value;

      if (rawTimestamp == null && rawValue == null) continue; // blank spacer row

      const timestamp = parseAircareTimestamp(rawTimestamp);
      if (!timestamp) {
        rejected.push({
          sheetName,
          rowNumber: r,
          errorType: "invalid_timestamp",
          message: `Could not parse timestamp "${String(rawTimestamp)}" (expected DD/MM/YYYY HH:mm)`,
          raw: { data: rawTimestamp, valore: rawValue },
        });
        continue;
      }

      const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
      if (rawValue == null || Number.isNaN(value)) {
        rejected.push({
          sheetName,
          rowNumber: r,
          errorType: "invalid_value",
          message: `Non-numeric value "${String(rawValue)}"`,
          raw: { data: rawTimestamp, valore: rawValue },
        });
        continue;
      }

      const bounds = HARD_BOUNDS[parameter];
      if (bounds && (value < bounds[0] || value > bounds[1])) {
        rejected.push({
          sheetName,
          rowNumber: r,
          errorType: "impossible_value",
          message: `Value ${value} outside physically plausible range [${bounds[0]}, ${bounds[1]}] for ${parameter}`,
          raw: { data: rawTimestamp, valore: rawValue },
        });
        continue;
      }

      rows.push({
        pointCode,
        parameter,
        sourceLabel: paramLabel,
        unit,
        timestamp,
        value,
        sheetName,
        rowNumber: r,
      });

      if (!dateRangeStart || timestamp < dateRangeStart) dateRangeStart = timestamp;
      if (!dateRangeEnd || timestamp > dateRangeEnd) dateRangeEnd = timestamp;
    }
  }

  return {
    rows,
    rejected,
    skippedSheets,
    pointCodes: Array.from(pointCodes).sort(),
    parametersDetected: Array.from(parametersDetected).sort(),
    dateRangeStart,
    dateRangeEnd,
    mappingUsed,
  };
}
