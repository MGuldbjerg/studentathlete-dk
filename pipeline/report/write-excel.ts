/**
 * Skriv international analyse-rapport til Excel.
 * Kan bruges standalone: npx tsx pipeline/report/write-excel.ts <json-fil>
 */

import ExcelJS from "exceljs";

interface ReportData {
  metadata: {
    generated_at: string;
    sample_size: number;
    schools_with_data: number;
    schools_by_division: { D1: number; D2: number; D3: number };
    total_schools_in_db: number;
    scale_factor: number;
  };
  totals: {
    athletes: number;
    international: number;
    international_pct: number;
    estimated_total: number;
    estimated_international: number;
  };
  by_country: Array<{
    country: string;
    count: number;
    pct: number;
    estimated: number;
    top_sports: Array<{ sport: string; count: number }>;
  }>;
  by_sport: Array<{
    sport: string;
    total: number;
    international: number;
    international_pct: number;
  }>;
  by_division: Array<{
    division: string;
    total: number;
    international: number;
    international_pct: number;
  }>;
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF00205B" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const PCT_FORMAT = "0.0%";

function styleHeader(ws: ExcelJS.Worksheet, colCount: number) {
  const row = ws.getRow(1);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "center" };
  }
}

export async function writeExcelReport(data: ReportData, outputPath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "StudentAthlete.dk";
  wb.created = new Date();

  // ── Ark 1: Oversigt ──────────────────────────────────────────────
  const wsOverview = wb.addWorksheet("Oversigt");
  wsOverview.columns = [
    { header: "Nøgletal", key: "label", width: 35 },
    { header: "Værdi", key: "value", width: 20 },
  ];
  styleHeader(wsOverview, 2);

  const m = data.metadata;
  const t = data.totals;
  wsOverview.addRows([
    { label: "Genereret", value: m.generated_at },
    { label: "Sample-størrelse (skoler)", value: m.sample_size },
    { label: "Skoler med data", value: m.schools_with_data },
    { label: "Heraf D1", value: m.schools_by_division.D1 },
    { label: "Heraf D2", value: m.schools_by_division.D2 },
    { label: "Heraf D3", value: m.schools_by_division.D3 },
    { label: "Totale skoler i database", value: m.total_schools_in_db },
    { label: "Skaleringsfaktor", value: parseFloat(m.scale_factor.toFixed(2)) },
    { label: "", value: "" },
    { label: "Atleter fundet (sample)", value: t.athletes },
    { label: "Internationale atleter (sample)", value: t.international },
    { label: "Internationale %", value: t.international_pct / 100 },
    { label: "Estimeret total (hele NCAA)", value: t.estimated_total },
    { label: "Estimeret internationale (hele NCAA)", value: t.estimated_international },
  ]);
  // Format %-celle
  wsOverview.getCell("B12").numFmt = PCT_FORMAT;

  // ── Ark 2: Per land ──────────────────────────────────────────────
  const wsCountry = wb.addWorksheet("Per land");
  wsCountry.columns = [
    { header: "#", key: "rank", width: 5 },
    { header: "Land", key: "country", width: 22 },
    { header: "Antal (sample)", key: "count", width: 15 },
    { header: "% af internationale", key: "pct", width: 18 },
    { header: "Estimeret (hele NCAA)", key: "estimated", width: 22 },
    { header: "Top-sportsgrene", key: "top_sports", width: 35 },
  ];
  styleHeader(wsCountry, 6);

  data.by_country.forEach((c, i) => {
    wsCountry.addRow({
      rank: i + 1,
      country: c.country,
      count: c.count,
      pct: c.pct / 100,
      estimated: c.estimated,
      top_sports: c.top_sports.map((s) => `${s.sport} (${s.count})`).join(", "),
    });
  });
  // Format %-kolonne
  wsCountry.getColumn("pct").numFmt = PCT_FORMAT;

  // ── Ark 3: Per sport ─────────────────────────────────────────────
  const wsSport = wb.addWorksheet("Per sport");
  wsSport.columns = [
    { header: "Sport", key: "sport", width: 25 },
    { header: "Total atleter", key: "total", width: 15 },
    { header: "Internationale", key: "international", width: 15 },
    { header: "Internationale %", key: "pct", width: 18 },
  ];
  styleHeader(wsSport, 4);

  data.by_sport.forEach((s) => {
    wsSport.addRow({
      sport: s.sport,
      total: s.total,
      international: s.international,
      pct: s.international_pct / 100,
    });
  });
  wsSport.getColumn("pct").numFmt = PCT_FORMAT;

  // ── Ark 4: Per division ──────────────────────────────────────────
  const wsDiv = wb.addWorksheet("Per division");
  wsDiv.columns = [
    { header: "Division", key: "division", width: 20 },
    { header: "Total atleter", key: "total", width: 15 },
    { header: "Internationale", key: "international", width: 15 },
    { header: "Internationale %", key: "pct", width: 18 },
  ];
  styleHeader(wsDiv, 4);

  data.by_division.forEach((d) => {
    wsDiv.addRow({
      division: d.division,
      total: d.total,
      international: d.international,
      pct: d.international_pct / 100,
    });
  });
  wsDiv.getColumn("pct").numFmt = PCT_FORMAT;

  // ── Ark 5: Skaleringsestimat ─────────────────────────────────────
  const wsScale = wb.addWorksheet("Skaleringsestimat");
  wsScale.columns = [
    { header: "Land", key: "country", width: 22 },
    { header: "Antal (sample)", key: "count", width: 15 },
    { header: "Estimeret (hele NCAA)", key: "estimated", width: 22 },
  ];
  styleHeader(wsScale, 3);

  data.by_country.slice(0, 30).forEach((c) => {
    wsScale.addRow({
      country: c.country,
      count: c.count,
      estimated: c.estimated,
    });
  });

  await wb.xlsx.writeFile(outputPath);
}

// Standalone-brug: npx tsx pipeline/report/write-excel.ts <json-fil>
if (process.argv[2] && process.argv[2].endsWith(".json")) {
  import("fs").then(async (fs) => {
    const jsonPath = process.argv[2];
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as ReportData;
    const xlsxPath = jsonPath.replace(".json", ".xlsx");
    await writeExcelReport(data, xlsxPath);
    console.log(`Excel-rapport gemt: ${xlsxPath}`);
  });
}
