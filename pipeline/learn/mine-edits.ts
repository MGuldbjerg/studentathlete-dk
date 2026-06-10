/**
 * Edit-mining (IDEA-laering.md loop 1): lær af redaktørens rettelser.
 *
 * For hver publiceret artikel hvor content != original_content:
 *   1. REGELBASERET: ord-diff → korte forkert→korrekt-par (uden tal — talændringer
 *      er faktarettelser og hører til verifikationssporet, ikke stil)
 *   2. LLM (gratis-kæden, fail-open): klassificér resten af diffen til
 *      generaliserbare fraserettelser + husregler; engangs-/faktaændringer smides væk
 *
 * Forslag lander i style_corrections med status='suggested' (active=0) →
 * godkend/afvis i admin → Stilguide. Gensyn med kendt par (uanset status)
 * tæller evidence_count op; 'rejected' genforeslås aldrig.
 *
 * Kør:  npx tsx pipeline/learn/mine-edits.ts
 *       npx tsx pipeline/learn/mine-edits.ts --dry-run --limit 5 --no-llm
 */
import { createD1Client, D1Client } from "../lib/d1-client";
import { ProviderChain } from "../lib/llm/provider-chain";

interface ArticleRow {
  id: number;
  title: string;
  content: string;
  original_content: string;
}

export interface PhraseSwap {
  wrong: string;
  correct: string;
}

export interface MinedSuggestion {
  wrong_phrase: string;
  correct_phrase: string;
  rule_type: "phrase" | "house_rule";
  category: string;
  note: string | null;
}

function parseArgs(): { limit: number; dryRun: boolean; useLlm: boolean } {
  const args = process.argv.slice(2);
  let limit = 10;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[i + 1], 10) || 10;
  }
  return { limit, dryRun: args.includes("--dry-run"), useLlm: !args.includes("--no-llm") };
}

// ─── Regelbaseret diff ───────────────────────────────────────────────────────

export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * LCS-baseret ord-diff → liste af udskiftnings-hunks (gamle ord, nye ord).
 * Artikler er ≤ ~1500 ord, så O(n·m) er fint.
 */
export function diffHunks(aTokens: string[], bTokens: string[]): Array<{ del: string[]; ins: string[] }> {
  const n = aTokens.length;
  const m = bTokens.length;
  // LCS-tabel
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = aTokens[i] === bTokens[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  // Gå igennem og saml hunks
  const hunks: Array<{ del: string[]; ins: string[] }> = [];
  let i = 0;
  let j = 0;
  let cur: { del: string[]; ins: string[] } | null = null;
  while (i < n && j < m) {
    if (aTokens[i] === bTokens[j]) {
      cur = null;
      i++;
      j++;
    } else {
      if (!cur) {
        cur = { del: [], ins: [] };
        hunks.push(cur);
      }
      if (lcs[i + 1][j] >= lcs[i][j + 1]) cur.del.push(aTokens[i++]);
      else cur.ins.push(bTokens[j++]);
    }
  }
  if (i < n || j < m) {
    if (!cur) {
      cur = { del: [], ins: [] };
      hunks.push(cur);
    }
    cur.del.push(...aTokens.slice(i));
    cur.ins.push(...bTokens.slice(j));
  }
  return hunks;
}

/** Andel af originalens ord der er ændret — >0.6 = omskrivning, par-mining upålidelig. */
export function changedRatio(original: string, edited: string): number {
  const a = tokenize(original);
  if (a.length === 0) return 1;
  const hunks = diffHunks(a, tokenize(edited));
  const changed = hunks.reduce((s, h) => s + h.del.length, 0);
  return changed / a.length;
}

function normalizePhrase(words: string[]): string {
  return words
    .join(" ")
    .toLowerCase()
    .replace(/^[^\wæøå]+|[^\wæøå]+$/g, "")
    .trim();
}

/**
 * Udtræk korte forkert→korrekt-par fra en redigering. Konservativ:
 * - begge sider 1-5 ord og ikke-tomme (rene sletninger/tilføjelser ignoreres)
 * - ingen tal på nogen side (talændringer = fakta, ikke stil)
 * - identiske efter normalisering (ren tegnsætning/casing) ignoreres
 * - enkeltords-swaps af småord (≤3 tegn: en/et/og/på…) ignoreres — grammatik
 *   bundet til konteksten, ikke en genbrugelig regel
 */
export function extractPhraseSwaps(original: string, edited: string): PhraseSwap[] {
  if (changedRatio(original, edited) > 0.45) return [];
  const swaps: PhraseSwap[] = [];
  for (const hunk of diffHunks(tokenize(original), tokenize(edited))) {
    if (hunk.del.length === 0 || hunk.ins.length === 0) continue;
    if (hunk.del.length > 5 || hunk.ins.length > 5) continue;
    const wrong = normalizePhrase(hunk.del);
    const correct = normalizePhrase(hunk.ins);
    if (!wrong || !correct || wrong === correct) continue;
    if (/\d/.test(wrong) || /\d/.test(correct)) continue;
    if (hunk.del.length === 1 && hunk.ins.length === 1 && wrong.length <= 3) continue;
    // Sætningsskel inde i frasen = diff-støj fra omskrivning, ikke et genbrugeligt par
    if (/[.!?:;]/.test(wrong) || /[.!?:;]/.test(correct)) continue;
    swaps.push({ wrong, correct });
  }
  // Mange par i én artikel = omskrivning snarere end punktrettelser → behold de
  // 5 korteste (kortest = mest generaliserbart), resten er støj
  if (swaps.length > 5) {
    swaps.sort((a, b) => a.wrong.length + a.correct.length - (b.wrong.length + b.correct.length));
    return swaps.slice(0, 5);
  }
  return swaps;
}

// ─── LLM-klassifikation ──────────────────────────────────────────────────────

const LLM_SYSTEM =
  "You analyze the difference between an AI-written Danish sports article draft and the " +
  "human editor's final version. Extract ONLY generalizable style lessons that apply to " +
  "FUTURE articles. NEVER include: changes to numbers/stats/scores/dates/names (those are " +
  "fact corrections), or one-off changes tied to this specific story. Lessons must be in " +
  "Danish. Respond with ONLY a JSON object.";

const LLM_SCHEMA = `{
  "phrase_fixes": [{"wrong": string, "correct": string, "note": string}],  // recurring word/phrase-level swaps
  "house_rules": [{"rule": string, "note": string}]  // broader prose/style patterns, e.g. "Kortere ingresser — maks to sætninger"
}`;

function extractJson(text: string): string | null {
  const stripped = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  const m = stripped.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}

export interface ChainLike {
  generate(opts: { system: string; prompt: string; max_tokens: number }): Promise<{ text: string }>;
}

export async function classifyEditsLLM(
  chain: ChainLike,
  original: string,
  edited: string,
): Promise<MinedSuggestion[]> {
  try {
    const prompt =
      `AI-UDKAST:\n${original.slice(0, 6000)}\n\n` +
      `REDAKTØRENS ENDELIGE VERSION:\n${edited.slice(0, 6000)}\n\n` +
      `Svar med JSON i dette format:\n${LLM_SCHEMA}`;
    const res = await chain.generate({ system: LLM_SYSTEM, prompt, max_tokens: 1000 });
    const json = extractJson(res.text);
    if (!json) return [];
    const raw = JSON.parse(json) as {
      phrase_fixes?: Array<{ wrong?: string; correct?: string; note?: string }>;
      house_rules?: Array<{ rule?: string; note?: string }>;
    };
    const out: MinedSuggestion[] = [];
    // Svage modeller ignorerer "word/phrase-level" — håndhæv det her: ingen
    // identiske par, maks 6 ord pr. side, maks 5 fraser + 3 husregler pr. artikel
    for (const f of (raw.phrase_fixes ?? []).slice(0, 8)) {
      if (!f.wrong?.trim() || !f.correct?.trim()) continue;
      const wrong = f.wrong.trim().toLowerCase();
      const correct = f.correct.trim().toLowerCase();
      if (wrong === correct) continue;
      if (/\d/.test(wrong) || /\d/.test(correct)) continue; // fakta-guard også her
      if (wrong.split(/\s+/).length > 6 || correct.split(/\s+/).length > 6) continue;
      out.push({
        wrong_phrase: wrong,
        correct_phrase: correct,
        rule_type: "phrase",
        category: "stil",
        note: f.note?.trim() || null,
      });
      if (out.length >= 5) break;
    }
    for (const r of (raw.house_rules ?? []).slice(0, 3)) {
      if (!r.rule?.trim()) continue;
      out.push({
        wrong_phrase: "",
        correct_phrase: r.rule.trim(),
        rule_type: "house_rule",
        category: "stil",
        note: r.note?.trim() || null,
      });
    }
    return out;
  } catch {
    return []; // fail-open: læring må aldrig vælte pipelinen
  }
}

// ─── Persistens ──────────────────────────────────────────────────────────────

/** Indsæt/optæl forslag. Returnerer 'inserted' | 'counted' | 'skipped_rejected'. */
async function upsertSuggestion(
  db: D1Client,
  s: MinedSuggestion,
  articleId: number,
): Promise<"inserted" | "counted" | "skipped_rejected"> {
  const existing = await db.query<{ id: number; status: string }>(
    `SELECT id, status FROM style_corrections
     WHERE lower(wrong_phrase) = ? AND lower(correct_phrase) = lower(?) AND rule_type = ?
     LIMIT 1`,
    [s.wrong_phrase.toLowerCase(), s.correct_phrase, s.rule_type],
  );
  const row = existing.results[0];
  if (row) {
    await db.execute(
      "UPDATE style_corrections SET evidence_count = evidence_count + 1 WHERE id = ?",
      [row.id],
    );
    return row.status === "rejected" ? "skipped_rejected" : "counted";
  }
  await db.execute(
    `INSERT INTO style_corrections (wrong_phrase, correct_phrase, category, note, active, status, rule_type, evidence_count)
     VALUES (?, ?, ?, ?, 0, 'suggested', ?, 1)`,
    [s.wrong_phrase, s.correct_phrase, s.category, s.note ?? `Lært af artikel #${articleId}`, s.rule_type],
  );
  return "inserted";
}

async function main(): Promise<void> {
  const { limit, dryRun, useLlm } = parseArgs();
  const db = createD1Client();
  const chain = useLlm ? new ProviderChain(db) : null;

  const articles = await db.query<ArticleRow>(
    `SELECT id, title, content, original_content
     FROM articles
     WHERE published = 1
       AND original_content IS NOT NULL
       AND content != original_content
       AND edits_mined_at IS NULL
     ORDER BY published_at ASC
     LIMIT ?`,
    [limit],
  );

  console.log(`${articles.results.length} redigerede artikel/artikler at lære af`);
  let inserted = 0;
  let counted = 0;

  for (const article of articles.results) {
    const suggestions: MinedSuggestion[] = [];

    for (const swap of extractPhraseSwaps(article.original_content, article.content)) {
      suggestions.push({
        wrong_phrase: swap.wrong,
        correct_phrase: swap.correct,
        rule_type: "phrase",
        category: "stil",
        note: `Lært af artikel #${article.id} ("${article.title.slice(0, 50)}")`,
      });
    }

    if (chain) {
      suggestions.push(...(await classifyEditsLLM(chain, article.original_content, article.content)));
    }

    // Dedupe indenfor artiklen
    const seen = new Set<string>();
    const unique = suggestions.filter((s) => {
      const key = `${s.rule_type}|${s.wrong_phrase}|${s.correct_phrase.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (dryRun) {
      console.log(`(dry-run) artikel #${article.id}: ${unique.length} forslag`);
      for (const s of unique) {
        console.log(
          s.rule_type === "phrase"
            ? `  - "${s.wrong_phrase}" → "${s.correct_phrase}"`
            : `  - husregel: ${s.correct_phrase}`,
        );
      }
      continue;
    }

    for (const s of unique) {
      const result = await upsertSuggestion(db, s, article.id);
      if (result === "inserted") inserted++;
      if (result === "counted") counted++;
    }
    await db.execute("UPDATE articles SET edits_mined_at = datetime('now') WHERE id = ?", [article.id]);
    console.log(`✓ artikel #${article.id}: ${unique.length} mønstre behandlet`);
  }

  if (!dryRun) {
    console.log(`\nFærdig: ${inserted} nye forslag (godkend i admin → Stilguide), ${counted} kendte mønstre optalt.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("mine-edits.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
