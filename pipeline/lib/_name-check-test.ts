/** Tests for the Nordic name check's pure part. Run: npx tsx pipeline/lib/_name-check-test.ts */
import { buildPrompt, decide, fixCommand, hasDiacritics, parseVerdicts, skeleton, validSuggestion, type Candidate } from "./name-check";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

// The skeleton: every way a roster folds the same name meets in one place.
expect("ø, o and oe meet", [skeleton("Thøgersen"), skeleton("Thogersen"), skeleton("Thoegersen")], ["thogersen", "thogersen", "thogersen"]);
expect("å, aa and a meet", skeleton("Sjåvåg") === skeleton("Sjavag"), true);
expect("a different name does not", skeleton("Thøgersen") === skeleton("Thorsen"), false);

// A suggestion must be the same name with Nordic letters restored.
expect("the Sofia case", validSuggestion("Sofia Thogersen", "Sofia Thøgersen"), true);
expect("oe digraph restored", validSuggestion("Anne Joergenrud", "Anne Jørgenrud"), true);
expect("a different name is refused (model swapped the surname)", validSuggestion("Sofia Thogersen", "Sofia Thorsen"), false);
expect("an extra token is refused", validSuggestion("Sofia Thogersen", "Sofia Marie Thøgersen"), false);
expect("no Nordic letter, no suggestion (é is not ours)", validSuggestion("Rene Perez", "René Pérez"), false);
expect("unchanged is no suggestion", validSuggestion("Hansen", "Hansen"), false);
expect("null / junk is refused", [validSuggestion("Hansen", null), validSuggestion("Hansen", 5), validSuggestion("Hansen", "  ")], [false, false, false]);
expect("diacritics detected", [hasDiacritics("Møller"), hasDiacritics("Moller"), hasDiacritics("Åhs")], [true, false, true]);

// The model's reply.
const good = '```json\n[{"id": 1, "suggested": "Sofia Thøgersen", "confidence": "high"}, {"id": 2, "suggested": null, "confidence": "high"}, {"id": "x"}, {"id": 3, "confidence": "maybe"}]\n```';
expect("fenced array, malformed items dropped", parseVerdicts(good).map((v) => v.id), [1, 2]);
expect("prose around the array", parseVerdicts('Here you go: [{"id":7,"suggested":null,"confidence":"low"}] done').length, 1);
expect("garbage and null", [parseVerdicts("no json"), parseVerdicts(null), parseVerdicts("[not json]")], [[], [], []]);

// Decisions.
const rows: Candidate[] = [
  { id: 1, name: "Sofia Thogersen", country: "DK", school: "Oregon", sport: "track-and-field" },
  { id: 2, name: "Emil Hansen", country: "DK", school: "X", sport: "golf" },
  { id: 3, name: "Anna Nordgard", country: "NO", school: "Y", sport: "golf" },
  { id: 4, name: "Lars Moller", country: "DK", school: "Z", sport: "golf" },
  { id: 5, name: "Eva Lysoe", country: "NO", school: "W", sport: "golf" },
];
const d = decide(rows, parseVerdicts(JSON.stringify([
  { id: 1, suggested: "Sofia Thøgersen", confidence: "high" },
  { id: 2, suggested: null, confidence: "high" },
  { id: 3, suggested: "Anna Nordgård", confidence: "low" },        // low confidence: not a suspect
  { id: 4, suggested: "Lars Mikkelsen", confidence: "high" },      // different name: refused
  // id 5 unanswered
])));
expect("suspect only for a valid, confident suggestion", d.map((x) => `${x.id}:${x.verdict}`), ["1:suspect", "2:ok", "3:ok", "4:ok"]);
expect("a skipped athlete gets no decision, so it is asked again", d.some((x) => x.id === 5), false);
expect("the suspect carries its suggestion", d[0].suggested, "Sofia Thøgersen");

expect("prompt lists every athlete", buildPrompt(rows).split("\n").filter((l) => /^\d+ \|/.test(l)).length, 5);
expect("fix command", fixCommand(12036, "Sofia Thøgersen"), 'npx tsx pipeline/fix/fix-athlete-name.ts 12036 "Sofia Thøgersen" --apply');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
