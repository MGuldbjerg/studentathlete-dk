/**
 * Who should write the articles: Gemini 2.5 Flash, or Claude Haiku on the
 * subscription?
 *
 * Gemini has written the drafts since the free chain was built, and its known
 * failures are the expensive kind: an "All-American" the source never gave,
 * a misgendered athlete. This re-writes recent stories from their STORED fact
 * sheets with each candidate and scores every draft with the project's own
 * mechanical check (quality-check.ts: numbers, roles, names, quotes, identity,
 * pronouns, timing, class year) — the same check every real draft gets — plus
 * one this check lacks: honours named in the draft but not in the sheet/source.
 *
 * The prompt is the production one (buildPrompt + the site's system prompt and
 * style corrections) minus the career timeline and teammates block, which are
 * assembled from live lookups. Both candidates get the identical prompt.
 *
 * Writes nothing to D1. Drafts go to --out (default logs/bakeoff/, gitignored)
 * so a person can read them; stdout carries only counts.
 *
 *   npx tsx pipeline/backtest/writer-bakeoff.ts [--stories 10] [--out DIR]
 *
 * Needs GEMINI_API_KEY and a logged-in `claude` (the script sets LLM_CLAUDE_CLI).
 *
 * First run 2026-10-08, 12 stories (6 DK, 6 UK), log logs/bakeoff/writers-2026-10-08.*:
 *
 *   Gemini  12/12 drafts, 4 high + 3 medium findings, ~2.7 s/story. It wrote 8580,
 *           a VOLLEYBALL report, as an article about Amelia Jones, a cross-country
 *           runner — wrong person, clean-looking draft.
 *   Haiku   12/12, 2 high + 2 medium, ~27 s/story (it thinks: ~1,400 output tokens
 *           for a 200-word piece). It REFUSED 8580 and 8419 (Standtke is not named
 *           in the source) — correct both times — but refused in prose, not JSON,
 *           and the parser took the prose for an article. The counter calls these
 *           "unsourced quotes". One real slip: 8357 "won 2-1" inferred from "1-1
 *           before his 88th-minute goal" — true, but not in the source.
 *
 * So before Haiku writes in production it needs a refusal channel: a JSON
 * {"cannot_write": "<reason>"} the generator treats as a rejection, never a draft.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createD1Client } from "../lib/d1-client";
import type { LLMProvider } from "../lib/llm/types";
import { GeminiProvider } from "../lib/llm/provider-gemini";
import { ClaudeCliProvider } from "../lib/llm/provider-claude-cli";
import { promptsFor } from "../generate/prompts";
import type { StyleCorrectionEntry } from "../generate/prompts/system";
import { countryProfile, DEFAULT_COUNTRY } from "../../src/lib/countries";
import { buildPrompt, selectArticleType, type StoryWithAthlete } from "../generate/generate-articles";
import { parseArticleOutputSmart, parseRefusal, salvageTruncatedJson } from "../generate/parse-output";
import { checkDraft, severityOf, type Finding } from "../generate/quality-check";
import { hasUnsourcedQuote } from "../generate/identity-guard";
import type { FactSheet } from "../generate/build-factsheet";

/** Honours a draft must not award on its own. */
const HONOUR_RE =
  /\b(all-americans?|all-conference|all-region|all-district|player of the (week|month|year)|rookie of the (week|year)|freshman of the (week|year)|mvp|record[- ]breaking|school record|national champions?)\b/gi;

export function unsourcedHonours(draft: string, allowed: string): string[] {
  const hay = allowed.toLowerCase();
  const seen = new Set<string>();
  for (const m of draft.matchAll(HONOUR_RE)) {
    const h = m[0].toLowerCase().replace(/s$/, "");
    if (!hay.includes(h.replace(/[- ]/g, " ")) && !hay.includes(h)) seen.add(h);
  }
  return [...seen];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface Score {
  ok: number;
  refused: number;
  parseFail: number;
  error: number;
  high: number;
  medium: number;
  honours: number;
  quotes: number;
  words: number;
  ms: number;
  byCategory: Map<string, number>;
}

function blank(): Score {
  return { ok: 0, refused: 0, parseFail: 0, error: 0, high: 0, medium: 0, honours: 0, quotes: 0, words: 0, ms: 0, byCategory: new Map() };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const n = Number(args[args.indexOf("--stories") + 1]) || 10;
  const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "logs/bakeoff";
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  mkdirSync(outDir, { recursive: true });

  process.env.LLM_CLAUDE_CLI = "1";
  const candidates: { label: string; p: LLMProvider; paceMs: number }[] = [
    // Gemini's free tier is 5 requests a minute.
    { label: "gemini-2.5-flash", p: new GeminiProvider(), paceMs: 13_000 },
    { label: "claude-haiku", p: new ClaudeCliProvider("haiku"), paceMs: 0 },
  ];
  for (const c of candidates) {
    if (!c.p.isAvailable()) throw new Error(`${c.label} is not available — check its key`);
  }

  const db = createD1Client();
  const corrections = (
    await db.query<StyleCorrectionEntry>(
      "SELECT wrong_phrase, correct_phrase, note, rule_type FROM style_corrections WHERE active = 1 LIMIT 50",
    )
  ).results;

  // Recent stories that became articles, half from each site where possible,
  // never sensitive ones (those carry their own care block and human review).
  const pick = async (country: string, limit: number) =>
    (
      await db.query<StoryWithAthlete>(
        `SELECT s.*, a.name as athlete_name, a.preferred_name, a.sport, a.university, a.hometown,
                a.position, a.division, a.class_year, a.expected_graduation, a.home_country,
                a.previous_school, a.gender
         FROM stories s JOIN athletes a ON s.athlete_id = a.id
         WHERE s.fact_status = 'built' AND s.fact_sheet IS NOT NULL AND s.sensitive IS NULL
           AND UPPER(COALESCE(a.home_country, 'DK')) = ?
           AND EXISTS (SELECT 1 FROM articles ar WHERE ar.story_id = s.id)
         ORDER BY s.discovered_at DESC LIMIT ?`,
        [country, limit],
      )
    ).results;
  const dk = await pick("DK", Math.ceil(n / 2));
  const uk = await pick("UK", n - dk.length);
  const stories = [...dk, ...uk];
  console.log(`${stories.length} stories (DK ${dk.length}, UK ${uk.length}); drafts → ${outDir}/writers-${stamp}.md\n`);

  const scores = new Map(candidates.map((c) => [c.label, blank()]));
  const report: string[] = [`# Writer bake-off ${stamp}\n`];

  for (const story of stories) {
    const country = (story.home_country ?? DEFAULT_COUNTRY).toUpperCase();
    const prompts = promptsFor(countryProfile(country).language);
    const language = prompts.language === "en" ? "en" : "da";
    const articleType = selectArticleType(story);
    const system = prompts.buildSystemPrompt(corrections, { jsonOutput: true });
    const prompt = buildPrompt(story, articleType, prompts);
    const allowed = [story.fact_sheet ?? "", story.headline ?? "", story.summary ?? "", story.content_raw ?? ""].join("\n");
    let quoteCount = 0;
    try {
      quoteCount = ((JSON.parse(story.fact_sheet ?? "{}") as FactSheet).quotes ?? []).length;
    } catch {
      quoteCount = 0;
    }

    console.log(`── [${story.id}] ${country} ${articleType}`);
    report.push(`\n## [${story.id}] ${story.athlete_name} — ${story.headline ?? ""} (${country}, ${articleType})\n`);

    for (const c of candidates) {
      const s = scores.get(c.label)!;
      if (c.paceMs) await sleep(c.paceMs);
      const t0 = Date.now();
      try {
        const res = await c.p.generate({ system, prompt, max_tokens: 2000, json: true });
        const ms = Date.now() - t0;
        s.ms += ms;
        const refusal = parseRefusal(res.text);
        if (refusal) {
          s.refused++;
          console.log(`   ${c.label.padEnd(18)} REFUSED: ${refusal.slice(0, 120)}, ${ms} ms`);
          report.push(`### ${c.label}: refused\n\n${refusal}\n`);
          continue;
        }
        const parsed =
          parseArticleOutputSmart(res.text, articleType) ??
          (() => {
            const salvaged = salvageTruncatedJson(res.text);
            return salvaged ? parseArticleOutputSmart(salvaged, articleType) : null;
          })();
        if (!parsed) {
          s.parseFail++;
          console.log(`   ${c.label.padEnd(18)} PARSE FAIL (${res.text.length} chars), ${ms} ms`);
          report.push(`### ${c.label}: parse fail\n\n\`\`\`\n${res.text.slice(0, 800)}\n\`\`\`\n`);
          continue;
        }
        const findings: Finding[] = checkDraft({
          title: parsed.title,
          content: parsed.content,
          factSheet: story.fact_sheet,
          sourceText: [story.headline, story.summary, story.content_raw].filter(Boolean).join("\n") || null,
          athlete: {
            name: story.athlete_name,
            preferredName: story.preferred_name,
            gender: story.gender,
            classYear: story.class_year,
            university: story.university,
            hometown: story.hometown,
            previousSchool: story.previous_school,
          },
          language,
        });
        const honours = unsourcedHonours(`${parsed.title} ${parsed.content}`, allowed);
        const fakeQuote = hasUnsourcedQuote(`${parsed.title}\n${parsed.content}`, quoteCount);
        const words = parsed.content.split(/\s+/).filter(Boolean).length;
        const high = findings.filter((f) => f.severity === "high").length;
        s.ok++;
        s.high += high;
        s.medium += findings.length - high;
        s.honours += honours.length;
        s.quotes += fakeQuote ? 1 : 0;
        s.words += words;
        for (const f of findings) s.byCategory.set(f.category, (s.byCategory.get(f.category) ?? 0) + 1);
        console.log(
          `   ${c.label.padEnd(18)} ${severityOf(findings).padEnd(6)} ${high} high, ${findings.length - high} medium` +
            `${honours.length ? `, honours: ${honours.join("/")}` : ""}${fakeQuote ? ", UNSOURCED QUOTE" : ""}, ${words} words, ${ms} ms`,
        );
        report.push(
          `### ${c.label} — ${severityOf(findings)}, ${words} words\n`,
          findings.length ? findings.map((f) => `- ${f.severity} ${f.category}: ${f.claim} — ${f.why}`).join("\n") + "\n" : "- no findings\n",
          honours.length ? `- honours not in source: ${honours.join(", ")}\n` : "",
          `\n**${parsed.title}**\n\n${parsed.content}\n`,
        );
      } catch (err) {
        s.error++;
        s.ms += Date.now() - t0;
        console.log(`   ${c.label.padEnd(18)} ERROR ${err instanceof Error ? err.message.slice(0, 100) : String(err)}`);
      }
    }
    writeFileSync(`${outDir}/writers-${stamp}.md`, report.join("\n"));
  }

  console.log("\n── totals ──");
  for (const c of candidates) {
    const s = scores.get(c.label)!;
    const cats = [...s.byCategory.entries()].map(([k, v]) => `${k} ${v}`).join(", ") || "none";
    console.log(
      `  ${c.label.padEnd(18)} drafts ${s.ok}/${stories.length}, refused ${s.refused} (parse fail ${s.parseFail}, error ${s.error}), ` +
        `${s.high} high + ${s.medium} medium findings [${cats}], ${s.honours} unsourced honours, ${s.quotes} unsourced quotes, ` +
        `${s.ok ? Math.round(s.words / s.ok) : 0} words avg, ${Math.round(s.ms / stories.length)} ms/story`,
    );
  }
}

main().catch((err) => {
  console.error("Writer bake-off failed:", err);
  process.exit(1);
});
