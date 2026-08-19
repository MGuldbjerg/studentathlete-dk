/**
 * Gem en Claude-gennemgang af en kladde i `draft_reviews`.
 *
 * Læser JSON fra en fil eller stdin — altså præcis hvad `claude -p` skrev — og
 * lægger den ved siden af det mekaniske tjek, så de to kan holdes op mod
 * hinanden OG mod `review_log` (menneskets endelige beslutning). Det er den
 * sammenligning der kan svare på om gennemgangene er værd at stole på.
 *
 * Tåler at modellen skriver JSON inde i en ```json-blok, og at den skriver en
 * sætning før eller efter. Ugyldigt svar gemmes IKKE (så en dårlig kørsel ikke
 * ser ud som en godkendelse), men logges tydeligt.
 *
 * Kør:
 *   npx tsx pipeline/generate/save-review.ts --article 108 --file review.json
 *   claude -p "$(cat pack.md)" | npx tsx pipeline/generate/save-review.ts --article 108
 */

import { readFileSync } from "node:fs";
import { createD1Client } from "../lib/d1-client";
import { draftHash } from "./check-drafts";

interface Review {
  verdict?: unknown;
  summary?: unknown;
  findings?: unknown;
}

/** Træk det første JSON-objekt ud af et svar der kan indeholde tekst og kodeblokke. */
export function extractJson(raw: string): Review | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidates = [fenced?.[1], raw];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.indexOf("{");
    const end = c.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try {
      const v = JSON.parse(c.slice(start, end + 1));
      if (v && typeof v === "object") return v as Review;
    } catch {
      // prøv næste kandidat
    }
  }
  return null;
}

const VERDICTS = new Set(["ok", "fix", "reject"]);

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const ai = argv.indexOf("--article");
  const id = ai >= 0 ? parseInt(argv[ai + 1] ?? "", 10) : NaN;
  const fi = argv.indexOf("--file");
  if (Number.isNaN(id)) {
    console.error("Brug: --article <id> [--file <svar.json>]");
    process.exit(1);
  }

  const raw = fi >= 0 ? readFileSync(argv[fi + 1], "utf8") : readFileSync(0, "utf8");
  const review = extractJson(raw);
  if (!review || !VERDICTS.has(String(review.verdict))) {
    console.error(
      `Ugyldigt svar for kladde #${id} — INTET gemt. En manglende gennemgang er bedre end en falsk.`,
    );
    console.error(raw.slice(0, 400));
    process.exit(1);
  }

  const db = createD1Client();
  const rows = await db.query<{ title: string; content: string }>(
    "SELECT title, content FROM articles WHERE id = ?",
    [id],
  );
  const art = rows.results[0];
  if (!art) {
    console.error(`Kladde #${id} findes ikke.`);
    process.exit(1);
  }

  const findings = Array.isArray(review.findings) ? review.findings : [];
  const high = findings.some(
    (f) => typeof f === "object" && f !== null && (f as { severity?: string }).severity === "high",
  );

  await db.execute(
    `INSERT OR REPLACE INTO draft_reviews
       (article_id, reviewer, verdict, severity, findings, summary, content_hash)
     VALUES (?, 'claude', ?, ?, ?, ?, ?)`,
    [
      id,
      String(review.verdict),
      high ? "high" : findings.length > 0 ? "medium" : "low",
      JSON.stringify(findings),
      String(review.summary ?? "").slice(0, 500),
      draftHash(art.title, art.content),
    ],
  );

  console.log(
    `  #${id}: ${String(review.verdict)} — ${String(review.summary ?? "").slice(0, 120)} (${findings.length} fund)`,
  );
}

if (process.argv[1] && /save-review\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Kunne ikke gemme gennemgang:", err);
    process.exit(1);
  });
}
