/**
 * Kvalitetstjek hver kladde i køen — mekanisk, gratis, idempotent.
 * ===============================================================
 *
 * Kører de syv tjek i `quality-check.ts` mod hver upubliceret kladde og gemmer
 * resultatet i `draft_reviews`. Fund skrives ogsÅ til `articles.fabrication_risk`
 * og `articles.fact_flags`, altså dét felt admin-badgen allerede læser: badgen
 * bliver dermed mekanisk uden at admin skal bygges om. Det var netop Mikkels
 * ønske — «I like the risk badge, but it needs to work».
 *
 * `verify-article.ts` (modellens formulerings-skøn) skriver kun når feltet er
 * NULL, så den overskriver ikke dette. Rækkefølgen i generate-workflowet er
 * derfor: skriv → tjek mekanisk → (evt.) verificér.
 *
 * Idempotent: en kladde med uændret indhold gennemgås ikke igen (content_hash).
 * Kørslen er derfor gratis at gentage hver time.
 *
 * Kør:
 *   npx tsx pipeline/generate/check-drafts.ts               # alle ukontrollerede
 *   npx tsx pipeline/generate/check-drafts.ts --article 108 --force
 *   npx tsx pipeline/generate/check-drafts.ts --notify       # + Discord pr. land
 */

import { createHash } from "node:crypto";
import { createD1Client, type D1Client } from "../lib/d1-client";
import { checkDraft, severityOf, summarise, type Finding } from "./quality-check";
import { notify, adminLink } from "../lib/notify";
import { countryProfile } from "../../src/lib/countries";

interface DraftRow {
  id: number;
  title: string;
  content: string;
  country: string | null;
  article_type: string | null;
  fact_sheet: string | null;
  content_raw: string | null;
  summary: string | null;
  headline: string | null;
  preferred_name: string | null;
  athlete_name: string | null;
  gender: string | null;
  class_year: string | null;
  university: string | null;
  hometown: string | null;
}

interface Args { article: number | null; force: boolean; notify: boolean; limit: number }

function parseArgs(argv: string[]): Args {
  const a: Args = { article: null, force: false, notify: false, limit: 50 };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i + 1];
    if (argv[i] === "--article" && v) { a.article = parseInt(v, 10) || null; i++; }
    else if (argv[i] === "--limit" && v) { a.limit = parseInt(v, 10) || a.limit; i++; }
    else if (argv[i] === "--force") a.force = true;
    else if (argv[i] === "--notify") a.notify = true;
  }
  return a;
}

export function draftHash(title: string, content: string): string {
  return createHash("sha256").update(`${title}\n${content}`, "utf8").digest("hex").slice(0, 16);
}

function verdictOf(findings: Finding[]): "ok" | "fix" | "reject" {
  if (findings.some((f) => f.category === "identity" || f.category === "timing")) return "reject";
  if (findings.length > 0) return "fix";
  return "ok";
}

export async function checkOne(
  db: D1Client,
  row: DraftRow,
  opts: { force: boolean },
): Promise<{ skipped: boolean; findings: Finding[]; hash: string }> {
  const hash = draftHash(row.title, row.content);

  if (!opts.force) {
    const seen = await db.query<{ n: number }>(
      `SELECT COUNT(*) n FROM draft_reviews
       WHERE article_id = ? AND reviewer = 'mechanical' AND content_hash = ?`,
      [row.id, hash],
    );
    if ((seen.results[0]?.n ?? 0) > 0) return { skipped: true, findings: [], hash };
  }

  const language = countryProfile(row.country ?? undefined).language === "en" ? "en" : "da";
  const findings = checkDraft({
    title: row.title,
    content: row.content,
    factSheet: row.fact_sheet,
    // Overskrift OG resumé lægges til kilden: når content_raw ikke kunne
    // hentes, er de dét kilden faktisk sagde.
    sourceText: [row.headline, row.summary, row.content_raw].filter(Boolean).join("\n") || null,
    athlete: row.athlete_name
      ? {
          name: row.athlete_name,
          preferredName: row.preferred_name,
          gender: row.gender,
          classYear: row.class_year,
          university: row.university,
          hometown: row.hometown,
        }
      : null,
    language,
  });

  const severity = severityOf(findings);
  await db.execute(
    `INSERT OR REPLACE INTO draft_reviews
       (article_id, reviewer, verdict, severity, findings, summary, content_hash)
     VALUES (?, 'mechanical', ?, ?, ?, ?, ?)`,
    [row.id, verdictOf(findings), severity, JSON.stringify(findings), summarise(findings), hash],
  );

  // Badgen i admin læser disse to felter. Mekanikken ejer dem nu.
  await db.execute(
    `UPDATE articles SET fabrication_risk = ?, fact_flags = ? WHERE id = ?`,
    [severity, JSON.stringify(findings.map((f) => `${f.category}: ${f.claim} — ${f.why}`)), row.id],
  );

  return { skipped: false, findings, hash };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const db = createD1Client();

  const where = args.article ? "a.id = ?" : "a.published = 0";
  const params = args.article ? [args.article] : [];

  const rows = await db.query<DraftRow>(
    `SELECT a.id, a.title, a.content, a.country, a.article_type,
            s.fact_sheet, s.content_raw, s.summary, s.headline,
            ath.preferred_name,
            ath.name AS athlete_name, ath.gender, ath.class_year,
            ath.university, ath.hometown
     FROM articles a
     LEFT JOIN stories s ON s.id = a.story_id
     LEFT JOIN athletes ath ON ath.id = a.athlete_id
     WHERE ${where}
     ORDER BY a.id DESC
     LIMIT ?`,
    [...params, args.limit],
  );

  if (rows.results.length === 0) {
    console.log("Ingen kladder at tjekke.");
    return;
  }

  const perCountry = new Map<string, { id: number; title: string; severity: string; summary: string }[]>();
  let checked = 0, skipped = 0;

  for (const row of rows.results) {
    const r = await checkOne(db, row, { force: args.force });
    if (r.skipped) { skipped++; continue; }
    checked++;
    const severity = severityOf(r.findings);
    const line = summarise(r.findings);
    console.log(`  #${row.id} [${severity}] ${row.title}\n      ${line}`);
    if (r.findings.length > 0) {
      const c = row.country ?? "DK";
      const list = perCountry.get(c) ?? [];
      list.push({ id: row.id, title: row.title, severity, summary: line });
      perCountry.set(c, list);
    }
  }

  console.log(`\nFærdig. Tjekket: ${checked} · sprunget over (uændret): ${skipped}.`);

  if (args.notify) {
    for (const [country, items] of perCountry) {
      const worst = items.some((i) => i.severity === "high") ? "high" : "medium";
      await notify(
        {
          title: `🔍 ${items.length} kladde(r) med mekaniske fund`,
          description:
            items
              .map((i) => `**#${i.id}** ${i.title}\n${i.summary}`)
              .join("\n\n")
              .slice(0, 3600) + `\n\n[Åbn kladdekøen](${adminLink(country, "/admin")})`,
          color: worst === "high" ? 15158332 : 15844367,
        },
        country,
      );
    }
  }
}

// Entrypoint-vagt: import må aldrig starte en kørsel.
if (process.argv[1] && /check-drafts\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Kvalitetstjek fejlede:", err);
    process.exit(1);
  });
}
