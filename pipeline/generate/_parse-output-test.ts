/**
 * Unit-tests for parse-output.ts — især JSON-stien (structured outputs) og
 * fallback-kæden JSON → linjebaseret format.
 * Kør: npx tsx pipeline/generate/_parse-output-test.ts
 */
import {
  looksLikeJson,
  parseArticleJson,
  parseArticleOutput,
  parseArticleOutputSmart,
} from "./parse-output";

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
  check("smart: JSON-vejen vinder", p?.title === "JSON-vej");
}
{
  const p = parseArticleOutputSmart("# Legacy-vej\n> Ingressen\n\nBrødtekst her.");
  check("smart: legacy-fallback titel", p?.title === "Legacy-vej", p?.title);
  check("smart: legacy-fallback ingress", p?.summary === "Ingressen");
  check("smart: legacy-fallback brødtekst", p?.content === "Brødtekst her.");
}
{
  // Gratis-model-klassikeren: fed titel uden # — legacy-parseren redder den
  const p = parseArticleOutputSmart("**Fed titel uden hash**\n\nBrødtekst.");
  check("smart: fed-titel-fallback", p?.title === "Fed titel uden hash", p?.title);
}

// ── Afbrudt JSON må ALDRIG falde ned i linjeparseren ─────────────────────────
//
// Det var fejlen bag #219, #247, #249 og #252: modellen blev klippet af midt i
// et JSON-svar, `parseArticleJson` gav null fordi der manglede en `}`, og
// linjeparseren tog så første linje — «{» — som overskrift. generateSlug("{")
// er den TOMME streng, og articles.slug er UNIQUE, så den første brudte kladde
// lagde beslag på den tomme slug og væltede hver eneste senere med
// «UNIQUE constraint failed». To historier (5153, 4914) fejlede i hver kørsel
// 13. september af præcis den grund.
{
  const truncated = '{\n\t"title": "cashman makes her mark",\n\t"summary": "Kort.",\n\t"content": "Første afsnit uden lukkende klamme."';
  check("afbrudt JSON: json-parser giver null", parseArticleJson(truncated) === null);
  check("afbrudt JSON: smart giver null (ingen «{»-titel)", parseArticleOutputSmart(truncated) === null);
}
{
  // Samme brud, men pakket i en kodeblok — modeller gør begge dele.
  const fenced = '```json\n{"title": "uafsluttet", "content": "Tekst uden lukning."';
  check("afbrudt fenced JSON → null", parseArticleOutputSmart(fenced) === null);
}
{
  // Den nøgne klamme alene er det værst tænkelige input.
  check("kun «{» → null", parseArticleOutputSmart("{") === null);
}
{
  // ... men markdown der TILFÆLDIGVIS nævner en klamme inde i teksten er
  // stadig markdown og skal parses som før.
  const md = "# Rigtig overskrift\n\nBrødtekst med { i midten.";
  check("markdown med klamme i brødteksten parses stadig", parseArticleOutputSmart(md)?.title === "Rigtig overskrift");
}
{
  check("looksLikeJson: nøgen klamme", looksLikeJson("{"));
  check("looksLikeJson: indrykket klamme", looksLikeJson("\n  {\"title\""));
  check("looksLikeJson: fenced", looksLikeJson('```json\n{"title"'));
  check("looksLikeJson: markdown er ikke JSON", !looksLikeJson("# Overskrift\n\nTekst {}"));
}

// ── Legacy-parseren uændret ──────────────────────────────────────────────────
{
  const p = parseArticleOutput("# T\n> I\n\nB");
  check("legacy stadig intakt", p.title === "T" && p.summary === "I" && p.content === "B");
}

console.log(`\nparse-output: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
