/**
 * Backfill af skolefarver (migration-015) til kampkort — regelbaseret, ingen LLM.
 *
 * Henter skolens website og leder efter farvekandidater i prioriteret rækkefølge:
 *   1. <meta name="theme-color">
 *   2. <meta name="msapplication-TileColor">
 *   3. CSS-variabler i inline <style> (--primary/--main/--brand/--color-primary…)
 * Kandidater der er for tæt på hvid/sort/grå forkastes (typiske theme-color-
 * defaults) — så hellere NULL og manuel farve i admin → Skoler.
 *
 * Kun skoler med aktive danske atleter (athletes.university = schools.name).
 *
 * Kør:  npx tsx pipeline/scrape/school-colors.ts            (kun skoler uden farve)
 *       npx tsx pipeline/scrape/school-colors.ts --dry-run
 *       npx tsx pipeline/scrape/school-colors.ts --force    (genberegn alle)
 *       npx tsx pipeline/scrape/school-colors.ts --limit 10
 */
import { createD1Client } from "../lib/d1-client";

interface SchoolRow {
  id: number;
  name: string;
  website: string;
  primary_color: string | null;
}

function parseArgs(): { limit: number; dryRun: boolean; force: boolean } {
  const args = process.argv.slice(2);
  let limit = 200;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[i + 1], 10) || 200;
  }
  return { limit, dryRun: args.includes("--dry-run"), force: args.includes("--force") };
}

/** Normalisér #abc / #aabbcc → #aabbcc (lowercase); null hvis ikke gyldig hex. */
export function normalizeHex(raw: string): string | null {
  const m = raw.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  let hex = m[1].toLowerCase();
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return `#${hex}`;
}

/**
 * Brugbar som kort-baggrund? Forkast næsten-hvid (lys), næsten-grå (umættet
 * OG midt-lys) — men behold mørke umættede farver (navy/sort-agtige skolefarver
 * er almindelige og fungerer fint som baggrund).
 */
export function isUsableCardColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
  if (lightness > 0.82) return false; // næsten hvid (#fff-defaults)
  if (saturation < 0.12 && lightness > 0.25) return false; // grå
  return true;
}

/** Find første brugbare farvekandidat i siden, prioriteret. */
export function extractSchoolColor(html: string): string | null {
  const candidates: string[] = [];
  const meta = (name: string) => {
    const re = new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`,
      "i",
    );
    const m = html.match(re);
    return m ? (m[1] ?? m[2]) : null;
  };
  const themeColor = meta("theme-color");
  if (themeColor) candidates.push(themeColor);
  const tileColor = meta("msapplication-TileColor");
  if (tileColor) candidates.push(tileColor);
  // CSS-variabler med brand-agtige navne
  const varRe = /--(?:color-)?(?:primary|main|brand|school)[\w-]*\s*:\s*(#[0-9a-fA-F]{3,6})\b/g;
  let m: RegExpExecArray | null;
  while ((m = varRe.exec(html)) !== null && candidates.length < 12) candidates.push(m[1]);

  for (const c of candidates) {
    const hex = normalizeHex(c);
    if (hex && isUsableCardColor(hex)) return hex;
  }
  return null;
}

async function fetchHomepage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StudentAthleteBot/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const { limit, dryRun, force } = parseArgs();
  const db = createD1Client();

  const where = force ? "" : "AND s.primary_color IS NULL";
  const schools = await db.query<SchoolRow>(
    `SELECT DISTINCT s.id, s.name, s.website, s.primary_color
     FROM schools s
     JOIN athletes a ON a.university = s.name AND a.active = 1
     WHERE s.website IS NOT NULL ${where}
     ORDER BY s.name LIMIT ?`,
    [limit],
  );

  console.log(`${schools.results.length} skole(r) med aktive danskere at behandle`);
  let found = 0;
  let missed = 0;

  for (const school of schools.results) {
    const html = await fetchHomepage(school.website);
    const color = html ? extractSchoolColor(html) : null;
    if (color) {
      found++;
      if (dryRun) {
        console.log(`(dry-run) ${school.name}: ${color}`);
      } else {
        await db.execute("UPDATE schools SET primary_color = ? WHERE id = ?", [color, school.id]);
        console.log(`✓ ${school.name}: ${color}`);
      }
    } else {
      missed++;
      console.log(`– ${school.name}: ingen brugbar farve fundet (sæt manuelt i admin → Skoler)`);
    }
  }

  console.log(`\nFærdig: ${found} farve(r) fundet, ${missed} til manuel udfyldning.`);
}

// Kør kun main når filen eksekveres direkte (ikke ved import i tests)
if (process.argv[1] && process.argv[1].endsWith("school-colors.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
