/**
 * Unit-tests for parse-output.ts — især JSON-stien (structured outputs) og
 * fallback-kæden JSON → linjebaseret format.
 * Kør: npx tsx pipeline/generate/_parse-output-test.ts
 */
import { parseArticleJson, parseArticleOutput, parseArticleOutputSmart } from "./parse-output";

let passed = 0;
let failed = 0;

function check(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// ── parseArticleJson: gyldige svar ───────────────────────────────────────────
{
  const t = '{"title": "Madsen scorer to mål for NC State", "summary": "Dansk angriber afgør kampen.", "content": "Første afsnit.\\n\\n## Kampen\\n\\nAndet afsnit."}';
  const p = parseArticleJson(t, "news");
  check("ren JSON parses", p !== null);
  check("ren JSON: titel", p?.title === "Madsen scorer to mål for NC State", p?.title);
  check("ren JSON: ingress", p?.summary === "Dansk angriber afgør kampen.");
  check("ren JSON: markdown-brødtekst bevaret", p?.content.includes("## Kampen") ?? false);
  check("ren JSON: article_type", p?.article_type === "news");
}

{
  // Kodeblok-indpakning (modeller gør det trods instruks)
  const t = '```json\n{"title": "Test", "summary": "S", "content": "Brødtekst."}\n```';
  const p = parseArticleJson(t);
  check("fenced JSON parses", p?.title === "Test");
}

{
  // Præfiks-tekst før JSON (fail-open: find {...})
  const t = 'Her er artiklen:\n{"title": "Test", "summary": "", "content": "Tekst."}';
  const p = parseArticleJson(t);
  check("JSON med præfiks-tekst parses", p?.title === "Test");
}

{
  // Markdown-markører i title strippes (belt & braces)
  const t = '{"title": "**Fed titel**", "summary": "S", "content": "Tekst."}';
  const p = parseArticleJson(t);
  check("fed-markører strippes fra titel", p?.title === "Fed titel", p?.title);
}

// ── parseArticleJson: ugyldige svar → null (fallback) ────────────────────────
check("ren markdown → null", parseArticleJson("# Overskrift\n> Ingress\nTekst") === null);
check("ødelagt JSON → null", parseArticleJson('{"title": "Ups', ) === null);
check("JSON uden content → null", parseArticleJson('{"title": "Kun titel"}') === null);
check("JSON uden titel → null", parseArticleJson('{"content": "Kun tekst"}') === null);
check("tom streng → null", parseArticleJson("") === null);

// ── parseArticleOutputSmart: fallback-kæden ──────────────────────────────────
{
  const p = parseArticleOutputSmart('{"title": "JSON-vej", "summary": "S", "content": "Tekst."}');
  check("smart: JSON-vejen vinder", p.title === "JSON-vej");
}
{
  const p = parseArticleOutputSmart("# Legacy-vej\n> Ingressen\n\nBrødtekst her.");
  check("smart: legacy-fallback titel", p.title === "Legacy-vej", p.title);
  check("smart: legacy-fallback ingress", p.summary === "Ingressen");
  check("smart: legacy-fallback brødtekst", p.content === "Brødtekst her.");
}
{
  // Gratis-model-klassikeren: fed titel uden # — legacy-parseren redder den
  const p = parseArticleOutputSmart("**Fed titel uden hash**\n\nBrødtekst.");
  check("smart: fed-titel-fallback", p.title === "Fed titel uden hash", p.title);
}

// ── Legacy-parseren uændret ──────────────────────────────────────────────────
{
  const p = parseArticleOutput("# T\n> I\n\nB");
  check("legacy stadig intakt", p.title === "T" && p.summary === "I" && p.content === "B");
}

console.log(`\nparse-output: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
