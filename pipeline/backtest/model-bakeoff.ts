/**
 * Which model should build the factsheets?
 *
 * mistral-small-latest carried the stage until 4 September 2026, when Mistral
 * set its free allowance to zero (x-ratelimit-limit-req-minute: 0). The account
 * is fine — the ministral-* family answers on the same key — so the question is
 * only which of the models we can still reach does the job as well.
 *
 * The measure is the real one: stories whose factsheet mistral-small built while
 * it was healthy, re-extracted by each candidate from the same source text. The
 * old sheet is the baseline, not the truth — a candidate that finds a fact
 * mistral-small missed is better, not wrong — so this reports what each model
 * found and leaves the judgement to a person reading the table.
 *
 *   npx tsx pipeline/backtest/model-bakeoff.ts [--stories 6] [--openrouter]
 *
 * A model id containing "/" is routed to OpenRouter and needs OPENROUTER_API_KEY;
 * anything else goes to Mistral on MISTRAL_API_KEY. --openrouter adds the free
 * OpenRouter candidates to the run.
 */
import { createD1Client } from "../lib/d1-client";
import { openAICompatibleGenerate } from "../lib/llm/openai-compat";
import { buildFactSheet, renderFactSheet, type ChainLike, type FactSheet } from "../generate/build-factsheet";
import { unsupportedNumbers } from "../generate/fact-numbers";

const MISTRAL_CANDIDATES = [
  "ministral-14b-latest",
  "ministral-8b-latest",
  "ministral-3b-latest",
  "open-mistral-nemo",
];

/**
 * The free OpenRouter models that declare structured output. Free there means
 * 20 req/min and 50 req/day (1000/day after $10 of lifetime credit), so these
 * are candidates for a fallback rung, not for carrying the stage.
 *
 * Measured 2026-09-10, 6 stories, and none of them earned the rung:
 *
 *   nemotron-3-super-120b:free  built 1/6, 26 s/story — a reasoning model whose
 *     `reasoning` field eats the token budget, so the JSON truncates on real
 *     sources. Valid JSON on a toy prompt, unusable on an 8 kB one.
 *   gemma-4-31b-it:free         built 0/6, 429 in ~200 ms every time, from
 *     `limit_source: upstream_provider_shared_pool` — not our quota, we are
 *     queueing behind everyone else on Google AI Studio's shared free pool.
 *   nex-n2.5-pro:free           built 4/6 but 85 s/story (once 152 s) and 14
 *     facts where ministral-3b found 94. A 60-story run would take 85 minutes.
 *
 * The free rung we already have on the Mistral key beats all three.
 */
const OPENROUTER_CANDIDATES = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "nex-agi/nex-n2.5-pro:free",
];

interface Row {
  id: number;
  headline: string | null;
  summary: string | null;
  content_raw: string | null;
  fact_sheet: string;
  athlete_name: string;
  sport: string;
  university: string;
}

/** An id with a "/" in it is an OpenRouter id; everything else is Mistral's. */
function chainFor(model: string): ChainLike {
  const viaOpenRouter = model.includes("/");
  const endpoint = viaOpenRouter
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.mistral.ai/v1/chat/completions";
  const key = viaOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.MISTRAL_API_KEY;
  if (!key) throw new Error(`missing ${viaOpenRouter ? "OPENROUTER_API_KEY" : "MISTRAL_API_KEY"}`);
  return {
    generate: (opts) =>
      openAICompatibleGenerate(
        endpoint,
        key,
        model,
        opts.system,
        opts.prompt,
        opts.max_tokens,
        model,
        opts.json ?? false,
      ),
  };
}

/** OpenRouter's free tier allows 20 requests a minute. Stay under it. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function count(sheet: FactSheet | null): { facts: number; quotes: number; substance: boolean } {
  if (!sheet) return { facts: 0, quotes: 0, substance: false };
  return {
    facts: sheet.stats.length + sheet.qualitative.length + sheet.other_facts.length,
    quotes: sheet.quotes.length,
    substance: sheet.has_substance,
  };
}

async function main(): Promise<void> {
  const n = Number(process.argv[process.argv.indexOf("--stories") + 1]) || 6;
  const withOpenRouter = process.argv.includes("--openrouter");
  const candidates = [...MISTRAL_CANDIDATES, ...(withOpenRouter ? OPENROUTER_CANDIDATES : [])];

  if (withOpenRouter && !process.env.OPENROUTER_API_KEY) {
    console.error("--openrouter needs OPENROUTER_API_KEY in the environment.");
    process.exit(1);
  }

  const db = createD1Client();

  // Built while mistral-small was still healthy, and long enough to be worth
  // extracting from.
  const { results } = await db.query<Row>(
    `SELECT s.id, s.headline, s.summary, s.content_raw, s.fact_sheet,
            a.name as athlete_name, a.sport, a.university
     FROM stories s JOIN athletes a ON s.athlete_id = a.id
     WHERE s.fact_status = 'built' AND s.fact_sheet IS NOT NULL
       AND s.content_raw IS NOT NULL AND length(s.content_raw) > 1200
       AND s.discovered_at < '2026-09-04'
     ORDER BY s.discovered_at DESC LIMIT ?`,
    [n],
  );

  console.log(`${results.length} stories, baseline = the sheet mistral-small built\n`);

  const totals = new Map<string, { facts: number; quotes: number; ok: number; ms: number; invented: number }>();

  for (const story of results) {
    const baseSheet = JSON.parse(story.fact_sheet) as FactSheet;
    const base = count(baseSheet);
    // A number in the sheet that is nowhere in the source is invention. This is
    // the project's own guard, the one that gates articles.
    const source = story.content_raw ?? "";
    const baseBad = unsupportedNumbers(renderFactSheet(baseSheet), source);
    console.log(`── [${story.id}] ${story.athlete_name} — ${story.headline?.slice(0, 60) ?? ""}`);
    console.log(`   mistral-small (stored)       ${base.facts} facts, ${base.quotes} quotes, ${baseBad.length} unsourced numbers`);

    for (const model of candidates) {
      // The free OpenRouter tier is 20 rpm; a candidate list of three plus four
      // Mistral models would trip it inside one story otherwise.
      if (model.includes("/")) await sleep(3500);
      const t0 = Date.now();
      let line: string;
      try {
        const res = await buildFactSheet(story, chainFor(model));
        const c = count(res.factSheet);
        const ms = Date.now() - t0;
        const agg = totals.get(model) ?? { facts: 0, quotes: 0, ok: 0, ms: 0, invented: 0 };
        const bad = res.factSheet ? unsupportedNumbers(renderFactSheet(res.factSheet), source) : [];
        if (res.status === "built") {
          agg.facts += c.facts;
          agg.quotes += c.quotes;
          agg.ok++;
          agg.invented += bad.length;
        }
        agg.ms += ms;
        totals.set(model, agg);
        const delta = c.facts - base.facts;
        line = `${res.status.padEnd(13)} ${String(c.facts).padStart(2)} facts (${delta >= 0 ? "+" : ""}${delta}), ${c.quotes} quotes, ${bad.length} unsourced${bad.length ? " [" + bad.slice(0, 5).join(", ") + "]" : ""}, ${ms} ms`;
      } catch (err) {
        line = `ERROR ${err instanceof Error ? err.message.slice(0, 90) : String(err)}`;
      }
      console.log(`   ${model.padEnd(38)} ${line}`);
    }
    console.log();
  }

  console.log("── totals ──");
  for (const model of candidates) {
    const t = totals.get(model);
    if (!t) continue;
    console.log(
      `  ${model.padEnd(38)} built ${t.ok}/${results.length}, ${t.facts} facts, ${t.quotes} quotes, ${t.invented} unsourced numbers, ${Math.round(t.ms / results.length)} ms/story`,
    );
  }
}

main().catch((err) => {
  console.error("Bake-off failed:", err);
  process.exit(1);
});
