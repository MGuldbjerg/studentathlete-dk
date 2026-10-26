/**
 * Review pack: published articles whose class year for the athlete differs
 * from the roster's (for the season the source spoke in). Mikkel 2026-10-26:
 * «Yes» to a pack after the quality sweep's «faktaark-tilskrivning».
 * ===========================================================================
 *
 * The sweep flags a fact sheet; most hits are a TEAMMATE's class word in the
 * same text. This keeps only articles where the word stands in a sentence
 * with the athlete's own surname, and puts three witnesses side by side:
 * the article's sentence, the source's sentence, and the school's own bio
 * page («Class» label, read now). Reads only; writes the pack to logs/review.
 *
 *   npx tsx pipeline/checks/class-year-pack.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";
import { createD1Client } from "../lib/d1-client";
import { classYearConflict } from "./factsheet-attribution";
import { pipelineUserAgent } from "../../src/lib/site";

const WORD: Record<string, RegExp> = {
  "fifth-year": /\bfifth[-\s]?year\b|\b5th[-\s]?year\b/i,
  graduate: /\bgraduate student\b|\bgrad student\b/i,
  senior: /\bsenior\b/i,
  junior: /\bjunior\b/i,
  sophomore: /\bsophomore\b/i,
  freshman: /\bfreshman\b|\bfirst[-\s]?year\b/i,
};

const sentences = (t: string) => t.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z«"'])/);

/** The sentences that carry both the class word and the athlete's surname. */
function about(text: string | null, surname: string, word: RegExp): string[] {
  if (!text) return [];
  return sentences(text).filter((s) => word.test(s) && s.toLowerCase().includes(surname.toLowerCase()));
}

/** The bio page's own class label («Class» → «Sophomore»), or null. */
async function bioClass(url: string | null, ua: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const $ = cheerio.load(await res.text());
    $("script, style, nav, footer").remove();
    let found: string | null = null;
    $("*").each((_, el) => {
      if (found) return;
      const n = $(el);
      if (n.children().length) return;
      const label = n.text().replace(/\s+/g, " ").trim().toLowerCase().replace(/:$/, "");
      if (!["class", "year", "academic year", "yr.", "cl."].includes(label)) return;
      const v = (n.next().text() || n.parent().next().text()).replace(/\s+/g, " ").trim();
      if (v && v.length <= 30 && /fresh|soph|junior|senior|grad|fifth|r-|fr|so|jr|sr|gr/i.test(v)) found = v;
    });
    return found;
  } catch { return null; }
}

async function main(): Promise<void> {
  const db = createD1Client();
  const ua = pipelineUserAgent();
  const rows = (await db.query<{
    story: number; discovered_at: string; fact_sheet: string; content_raw: string | null; source_url: string | null;
    athlete: number; name: string; class_year: string | null; bio_url: string | null; country: string;
    article: number; title: string; content: string; slug: string;
  }>(
    `SELECT s.id AS story, s.discovered_at, s.fact_sheet, s.content_raw, s.source_url,
            a.id AS athlete, a.name, a.class_year, a.bio_url, ar.country,
            ar.id AS article, ar.title, ar.content, ar.slug
       FROM stories s JOIN athletes a ON a.id = s.athlete_id
       JOIN articles ar ON ar.story_id = s.id AND ar.published = 1
      WHERE s.fact_status = 'built' AND s.fact_sheet IS NOT NULL`)).results;

  const items: string[] = [];
  let n = 0;
  for (const r of rows) {
    const flag = classYearConflict(r.fact_sheet, r.class_year, { claimDate: r.discovered_at });
    if (!flag) continue;
    const surname = r.name.trim().split(/\s+/).pop()!;
    const word = WORD[flag.claimed];
    const inArticle = about(r.content, surname, word);
    if (!inArticle.length) continue;      // the article does not say it about the athlete
    n++;
    const bio = await bioClass(r.bio_url, ua);
    items.push([
      `## ${n}. Article #${r.article} (${r.country}) — ${r.name}`,
      ``,
      `**${r.title}**`,
      ``,
      `| Witness | Says |`,
      `|---|---|`,
      `| Our article | ${inArticle.map((s) => `«${s}»`).join("<br>")} |`,
      `| Source (story #${r.story}, ${r.discovered_at.slice(0, 10)}) | ${about(r.content_raw, surname, word).map((s) => `«${s}»`).join("<br>") || "— (word not next to the name)"} |`,
      `| Roster, for that season | ${flag.roster} (today: ${r.class_year}) |`,
      `| School bio page, today | ${bio ?? "—"}${r.bio_url ? ` ([bio](${r.bio_url}))` : ""} |`,
      r.source_url ? `\nSource: ${r.source_url}` : "",
      ``,
    ].join("\n"));
    await new Promise((res) => setTimeout(res, 500));
  }
  const date = new Date().toISOString().slice(0, 10);
  mkdirSync("logs/review", { recursive: true });
  const path = `logs/review/class-year-${date}.md`;
  writeFileSync(path, `# Class-year conflicts in published articles — ${date}\n\n${n} articles where the class word is in a sentence with the athlete's own name and differs from the roster for that season.\n\n${items.join("\n")}`);
  console.log(`${n} articles → ${path}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
