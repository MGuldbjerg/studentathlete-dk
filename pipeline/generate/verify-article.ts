/**
 * Fase 3 — Verifikation. Sammenligner en genereret artikel med dens FAKTAARK
 * (fase 1) og flager påstande uden kildebelæg. En påstand er DÆKKET hvis den kan
 * spores til ET fact-sheet-element — tal, resultat, begivenhed, citat ELLER en
 * kvalitativ observation. Kildebaseret kvalitativ prosa flages IKKE. Kun påstande
 * uden belæg (opdigtede tal, scores, datoer, aldre, steder, citater) flages.
 *
 * Kør: npx tsx pipeline/generate/verify-article.ts [--limit N] [--dry-run]
 */

import { createD1Client } from "../lib/d1-client";
import { ProviderChain } from "../lib/llm/provider-chain";
import { renderFactSheet, type FactSheet } from "./build-factsheet";

export interface VerifyArticleInput {
  title: string;
  content: string;
}

export interface ArticleVerdict {
  fabrication_risk: "low" | "medium" | "high";
  flags: string[];
}

export interface ChainLike {
  generate(opts: { system: string; prompt: string; max_tokens: number; preferProvider?: string }): Promise<{ text: string }>;
}

const SYSTEM_MESSAGE =
  "You are a strict fact-checker for sports articles. You are given a FACT SHEET (the only " +
  "permitted facts), the athlete's PROFILE (known true facts), and an ARTICLE. Find every " +
  "factual claim in the ARTICLE that is NOT supported. A claim is SUPPORTED if it traces to ANY " +
  "fact-sheet entry — numbers, result, event, quote, OR qualitative observation — or to the " +
  "PROFILE. Do NOT flag sourced qualitative descriptions, reasonable framing/word choice, or the " +
  "athlete's profile (name, sport, school, hometown, class year). DO flag invented numbers, scores, " +
  "minutes, dates, ages, places, statistics, quotes, or events that appear in neither the fact sheet " +
  "nor the profile. The article is in Danish; the fact sheet may be in English — judge meaning, not language. " +
  "Respond with ONLY a JSON object.";

function parseArgs(): { limit: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  let limit = 20;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[i + 1], 10) || 20;
    if (args[i] === "--dry-run") dryRun = true;
  }
  return { limit, dryRun };
}

function extractJson(text: string): string | null {
  const stripped = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  const m = stripped.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}

const RISKS = new Set(["low", "medium", "high"]);

/**
 * Verificér én artikel mod dens faktaark + profil. Returnerer verdict, eller null
 * ved LLM-/parsningsfejl (= uverificeret; kalderen lader fabrication_risk være NULL).
 */
export async function verifyArticle(
  article: VerifyArticleInput,
  factSheetText: string,
  profileFacts: string,
  chain: ChainLike,
): Promise<ArticleVerdict | null> {
  const prompt = [
    "PROFILE (known true facts):",
    profileFacts,
    "",
    "FACT SHEET (only permitted facts):",
    factSheetText || "(empty)",
    "",
    "ARTICLE:",
    article.title,
    article.content.slice(0, 4000),
    "",
    'Respond ONLY with JSON: {"fabrication_risk": "low"|"medium"|"high", "flags": ["<short unsupported claim>", ...]}',
    "high = any invented number/score/date/age/quote/event; medium = minor unsupported detail; low = all claims supported.",
  ].join("\n");

  let text: string;
  try {
    const res = await chain.generate({ system: SYSTEM_MESSAGE, prompt, max_tokens: 400 });
    text = res.text;
  } catch {
    return null;
  }

  const jsonStr = extractJson(text);
  if (!jsonStr) return null;
  let raw: { fabrication_risk?: unknown; flags?: unknown };
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  const flags = Array.isArray(raw.flags) ? raw.flags.filter((f): f is string => typeof f === "string") : [];
  let risk = typeof raw.fabrication_risk === "string" ? raw.fabrication_risk.toLowerCase() : "";
  if (!RISKS.has(risk)) risk = flags.length > 0 ? "medium" : "low";
  // Konsistens: påstande flaget men model sagde 'low' → mindst 'medium'.
  if (flags.length > 0 && risk === "low") risk = "medium";

  return { fabrication_risk: risk as ArticleVerdict["fabrication_risk"], flags };
}

interface ArticleRow {
  id: number;
  title: string;
  content: string;
  fact_sheet: string | null;
  athlete_name: string;
  sport: string;
  university: string;
  hometown: string | null;
  position: string | null;
  class_year: string | null;
}

function profileString(a: ArticleRow): string {
  return [
    `Name: ${a.athlete_name}`,
    `Sport: ${a.sport}`,
    `University: ${a.university}`,
    a.hometown ? `Hometown: ${a.hometown}` : "",
    a.position ? `Position: ${a.position}` : "",
    a.class_year ? `Class year: ${a.class_year}` : "",
  ].filter(Boolean).join("; ");
}

async function main(): Promise<void> {
  const { limit, dryRun } = parseArgs();
  const db = createD1Client();
  const chain = new ProviderChain(db);

  const result = await db.query<ArticleRow>(
    `SELECT ar.id, ar.title, ar.content, s.fact_sheet,
            a.name as athlete_name, a.sport, a.university, a.hometown, a.position, a.class_year
     FROM articles ar
     JOIN stories s ON ar.story_id = s.id
     JOIN athletes a ON ar.athlete_id = a.id
     WHERE ar.published = 0
       AND ar.fabrication_risk IS NULL
       AND s.fact_sheet IS NOT NULL
     ORDER BY ar.id DESC
     LIMIT ?`,
    [limit],
  );
  const articles = result.results;
  console.log(`Verificerer ${articles.length} kladde(r)${dryRun ? " (DRY-RUN)" : ""}...\n`);

  let high = 0, medium = 0, low = 0, unverified = 0;
  for (const ar of articles) {
    let factSheetText = "";
    try {
      factSheetText = renderFactSheet(JSON.parse(ar.fact_sheet ?? "{}") as FactSheet);
    } catch {
      /* tomt faktaark */
    }
    const verdict = await verifyArticle(
      { title: ar.title, content: ar.content },
      factSheetText,
      profileString(ar),
      chain,
    );

    if (!verdict) {
      unverified++;
      console.log(`  [?]    ${ar.id} ${ar.title.slice(0, 55)} — uverificeret (LLM-fejl)`);
      continue;
    }
    const tag = verdict.fabrication_risk === "high" ? "HIGH" : verdict.fabrication_risk === "medium" ? "med " : "low ";
    console.log(`  [${tag}] ${ar.id} ${ar.title.slice(0, 55)}${verdict.flags.length ? ` — ${verdict.flags.join("; ")}` : ""}`);

    if (!dryRun) {
      await db.execute(
        `UPDATE articles SET fabrication_risk = ?, fact_flags = ? WHERE id = ?`,
        [verdict.fabrication_risk, JSON.stringify(verdict.flags), ar.id],
      );
    }
    if (verdict.fabrication_risk === "high") high++;
    else if (verdict.fabrication_risk === "medium") medium++;
    else low++;
  }

  console.log(`\nFærdig. Høj: ${high} | Medium: ${medium} | Lav: ${low} | Uverificeret: ${unverified}`);
}

if (process.argv[1] && process.argv[1].includes("verify-article")) {
  main().catch((err) => {
    console.error("Artikel-verifikation fejlede:", err);
    process.exit(1);
  });
}
