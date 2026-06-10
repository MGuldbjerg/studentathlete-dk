/**
 * Tests for mine-edits rene funktioner (diff + fraseudtræk + LLM-parsing).
 * Kør: npx tsx pipeline/learn/_mine-edits-test.ts
 */
import {
  tokenize,
  diffHunks,
  changedRatio,
  extractPhraseSwaps,
  classifyEditsLLM,
  type ChainLike,
} from "./mine-edits";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((err) => {
      failed++;
      console.error(`  ✗ ${name}: ${err.message}`);
    });
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg ?? "assertEqual"}: fik ${a}, ventede ${e}`);
}

async function main() {
  console.log("tokenize:");
  await test("splitter på whitespace, bevarer æøå", () =>
    assertEqual(tokenize("Søren  løber\nstærkt"), ["Søren", "løber", "stærkt"]));
  await test("tom streng → tom liste", () => assertEqual(tokenize("  "), []));

  console.log("diffHunks:");
  await test("identiske tekster → ingen hunks", () =>
    assertEqual(diffHunks(["a", "b"], ["a", "b"]), []));
  await test("enkelt udskiftning fanges", () =>
    assertEqual(diffHunks(["en", "stor", "kamp"], ["en", "vigtig", "kamp"]), [
      { del: ["stor"], ins: ["vigtig"] },
    ]));
  await test("indsættelse uden sletning", () =>
    assertEqual(diffHunks(["en", "kamp"], ["en", "vigtig", "kamp"]), [
      { del: [], ins: ["vigtig"] },
    ]));
  await test("hale-ændring fanges", () =>
    assertEqual(diffHunks(["a", "b", "c"], ["a", "b", "d"]), [{ del: ["c"], ins: ["d"] }]));

  console.log("changedRatio:");
  await test("identisk → 0", () => assertEqual(changedRatio("en god kamp", "en god kamp"), 0));
  await test("total omskrivning → høj ratio", () => {
    const r = changedRatio("en god kamp i går", "noget helt andet står her nu");
    if (r < 0.6) throw new Error(`ratio ${r} < 0.6`);
  });

  console.log("extractPhraseSwaps:");
  await test("udskiftning udtrækkes; småords-swap (et→en) filtreres", () =>
    assertEqual(extractPhraseSwaps("Det var et flot opgør i aftes.", "Det var en flot kamp i aftes."), [
      { wrong: "opgør", correct: "kamp" },
    ]));
  await test("flerords-swap bevares samlet", () =>
    assertEqual(extractPhraseSwaps("Han mærker trykket fra bænken nu", "Han mærker presset fra bænken nu"), [
      { wrong: "trykket", correct: "presset" },
    ]));
  await test("talændringer ignoreres (fakta, ikke stil)", () =>
    assertEqual(extractPhraseSwaps("Han scorede 12 point mod holdet", "Han scorede 19 point mod holdet"), []));
  await test("ren tegnsætning/casing ignoreres", () =>
    assertEqual(extractPhraseSwaps("kampen var Vigtig her", "kampen var vigtig her"), []));
  await test("lange hunks (>5 ord) ignoreres", () =>
    assertEqual(
      extractPhraseSwaps(
        "Indledning. et to tre fire fem seks syv otte. Slutning her til sidst.",
        "Indledning. ni ti elleve tolv tretten fjorten femten seksten. Slutning her til sidst.",
      ),
      [],
    ));
  await test("omskrivning (>60% ændret) giver ingen par", () =>
    assertEqual(extractPhraseSwaps("kort original tekst her", "fuldstændig anderledes ny formulering skrevet om"), []));
  await test("ren sletning giver ingen par", () =>
    assertEqual(extractPhraseSwaps("en meget unødvendigt lang sætning", "en meget lang sætning"), []));

  console.log("classifyEditsLLM:");
  const stubChain = (text: string): ChainLike => ({ generate: async () => ({ text }) });
  await test("parser gyldigt JSON-svar med begge typer", async () => {
    const out = await classifyEditsLLM(
      stubChain(
        '```json\n{"phrase_fixes":[{"wrong":"Opgør","correct":"kamp","note":"dansk idiom"}],"house_rules":[{"rule":"Kortere ingresser","note":""}]}\n```',
      ),
      "a",
      "b",
    );
    assertEqual(out.length, 2);
    assertEqual(out[0], {
      wrong_phrase: "opgør",
      correct_phrase: "kamp",
      rule_type: "phrase",
      category: "stil",
      note: "dansk idiom",
    });
    assertEqual(out[1].rule_type, "house_rule");
    assertEqual(out[1].correct_phrase, "Kortere ingresser");
  });
  await test("fraserettelser med tal filtreres (fakta-guard)", async () => {
    const out = await classifyEditsLLM(
      stubChain('{"phrase_fixes":[{"wrong":"scorede 12","correct":"scorede 19","note":""}],"house_rules":[]}'),
      "a",
      "b",
    );
    assertEqual(out, []);
  });
  await test("ugyldigt svar → tom liste (fail-open)", async () => {
    const out = await classifyEditsLLM(stubChain("Jeg kan desværre ikke hjælpe med JSON i dag"), "a", "b");
    assertEqual(out, []);
  });
  await test("kastende chain → tom liste (fail-open)", async () => {
    const out = await classifyEditsLLM(
      { generate: async () => { throw new Error("nede"); } },
      "a",
      "b",
    );
    assertEqual(out, []);
  });

  console.log(`\n${passed} bestået, ${failed} fejlet`);
  if (failed > 0) process.exit(1);
}

main();
