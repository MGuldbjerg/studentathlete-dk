/** Tests for fix-athlete-name's text handling. Run: npx tsx pipeline/fix/_fix-athlete-name-test.ts */
import { correctionNote, replaceName } from "./fix-athlete-name";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

const OLD = "Sofia Thogersen", NEW = "Sofia Thøgersen";
expect("full name and bare surname", replaceName("Sofia Thogersen løb. Thogersen blev nr. 11.", OLD, NEW), { text: "Sofia Thøgersen løb. Thøgersen blev nr. 11.", changes: 2 });
expect("possessive", replaceName("Thogersens tid", OLD, NEW).text, "Thøgersens tid");
expect("inside another word is left alone", replaceName("Fra Hothogersen", OLD, NEW).changes, 0);
expect("already correct text is untouched", replaceName("Sofia Thøgersen", OLD, NEW).changes, 0);
expect("first name change only", replaceName("Sofie Hansen", "Sofie Hansen", "Sophie Hansen"), { text: "Sophie Hansen", changes: 1 });
expect("regex characters in a name are safe", replaceName("A. B.-C (x)", "A. B.-C (x)", "A. B.-D (x)").text, "A. B.-D (x)");
expect("empty text", replaceName("", OLD, NEW).changes, 0);

const d = new Date("2026-11-02T10:00:00Z");
expect("Danish note", correctionNote(OLD, NEW, "DK", d), "Rettet 2. november 2026: Navnet staves «Sofia Thøgersen», ikke «Sofia Thogersen». En tidligere version af artiklen brugte den forkerte stavemåde.");
expect("English note for UK articles", correctionNote(OLD, NEW, "UK", d).startsWith("Updated 2 November 2026:"), true);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
