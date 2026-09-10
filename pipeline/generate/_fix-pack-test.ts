/**
 * Spærrerne i natkørslen — den der RETTER og AFVISER (2026-09-10).
 *
 * Kørslen har to farlige kanter, og begge prøves her, fordi ingen af dem kan
 * ses i en log bagefter:
 *
 *   1. **Løkken.** En rettelse ændrer indholdet, så hashen skifter, så næste
 *      nats gennemgang læser den rettede tekst — meningen. Men rettes den så
 *      igen, retter maskinen sin egen rettelse i ring, hver nat, på Mikkels
 *      regning. `alreadyFixed` er spærren.
 *   2. **Den forældede dom.** Dømmes en kladde `reject`, og redigerer Mikkel
 *      den derefter i /admin, må natkørslen IKKE slette hans arbejde på
 *      baggrund af en dom over en tekst der ikke findes længere. Hashen skal
 *      passe, ellers gøres der ingenting.
 *
 * Dertil `rejectReasonFor`: de grove spærrer om selve den rettede tekst. De
 * skal fange en kørsel der er gået galt — ikke smage på redaktionen.
 */
import { draftHash } from "./check-drafts";
import { actionFor, alreadyFixed, type FixRow } from "./fix-pack";
import { extractJson, rejectReasonFor } from "./apply-draft-fix";

let passed = 0;
let failed = 0;

function ok(cond: boolean, name: string): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

const TITLE = "MacLean kåret til ugens spiller";
const CONTENT =
  "Marianna MacLean fik en hånd med i alle seks mål, da Holy Cross vandt hjemme. ".repeat(8);

/** En kladde hvor gennemgangen handler om PRÆCIS det indhold der ligger. */
function row(over: Partial<FixRow> = {}): FixRow {
  const title = over.title ?? TITLE;
  const content = over.content ?? CONTENT;
  return {
    id: 237,
    title,
    content,
    art_summary: null,
    country: "UK",
    article_type: "match",
    claude_fixed_content: null,
    source_url: null,
    fact_sheet: null,
    content_raw: null,
    summary: null,
    athlete_name: "Marianna MacLean",
    gender: "F",
    class_year: "Jr.",
    expected_graduation: null,
    sport: "field hockey",
    position: null,
    university: "Holy Cross",
    hometown: null,
    previous_school: null,
    review_verdict: "fix",
    review_findings: "[]",
    review_summary: "opdigtet stilling",
    review_hash: draftHash(title, content),
    mech_findings: null,
    ...over,
  };
}

// ── 1. Hvad kørslen gør ved en kladde ───────────────────────────────────────
ok(actionFor(row()) === "fix", "dom fix på uændret indhold → ret");
ok(actionFor(row({ review_verdict: "reject" })) === "reject", "dom reject → afvis");
ok(actionFor(row({ review_verdict: "ok" })) === null, "dom ok → gør ingenting");
ok(actionFor(row({ review_verdict: null, review_hash: null })) === null, "ingen gennemgang → gør ingenting");

// ── 2. Løkkespærren ─────────────────────────────────────────────────────────
ok(
  actionFor(row({ claude_fixed_content: CONTENT })) === null,
  "allerede maskinrettet → rettes IKKE igen (ellers retter den i ring hver nat)",
);
ok(
  actionFor(row({ claude_fixed_content: "en ÆLDRE maskinrettelse" })) === "fix",
  "en gammel rettelse af et ANDET indhold spærrer ikke for den nye",
);
ok(alreadyFixed({ content: CONTENT, claude_fixed_content: CONTENT }), "alreadyFixed: samme tekst");
ok(!alreadyFixed({ content: CONTENT, claude_fixed_content: null }), "alreadyFixed: aldrig rettet");

// ── 3. Den forældede dom ────────────────────────────────────────────────────
// Mikkel har redigeret kladden efter gennemgangen: hashen passer ikke længere.
ok(
  actionFor(row({ review_hash: draftHash(TITLE, "en helt anden tekst") })) === null,
  "dom over et andet indhold → ret ikke",
);
ok(
  actionFor(row({ review_verdict: "reject", review_hash: draftHash(TITLE, "gammel tekst") })) === null,
  "forældet reject sletter IKKE en kladde Mikkel har redigeret siden",
);

// ── 4. Spærrerne om den rettede tekst ───────────────────────────────────────
const cur = { title: TITLE, content: CONTENT, athlete_name: "Marianna MacLean" };
const rettet = CONTENT.replace("seks", "alle seks") + "MacLean fik to mål og fire oplæg.";

ok(rejectReasonFor({ title: TITLE, content: rettet }, cur) === null, "en almindelig rettelse går igennem");
ok(
  rejectReasonFor({ title: TITLE, content: CONTENT.slice(0, 200) }, cur) !== null,
  "en tekst under 400 tegn kasseres",
);
ok(
  rejectReasonFor({ title: TITLE, content: CONTENT + CONTENT + CONTENT }, cur) !== null,
  "en tekst over det dobbelte kasseres — en rettelse skærer, den fordobler ikke",
);
ok(rejectReasonFor({ title: "", content: rettet }, cur) !== null, "tom titel kasseres");
ok(
  rejectReasonFor({ title: TITLE, content: CONTENT }, cur) !== null,
  "uændret tekst kasseres (der er intet at gemme)",
);
ok(
  rejectReasonFor({ title: TITLE, content: rettet.replace(/MacLean/g, "spilleren") }, cur) !== null,
  "atleten skrevet ud af sin egen artikel kasseres",
);
// Kladden må gerne blive KORTERE — det er tit hele rettelsen (#237 var padding).
ok(
  rejectReasonFor({ title: TITLE, content: CONTENT.slice(0, 500) }, cur) === null,
  "en kortere, sandere tekst er en gyldig rettelse",
);

// ── 5. Svaret fra modellen ──────────────────────────────────────────────────
ok(
  extractJson('```json\n{"verdict":"fix","content":"x"}\n```')?.verdict === "fix",
  "JSON i en kodeblok læses",
);
ok(
  extractJson('Her er rettelsen:\n{"verdict":"reject"}\nHåber det passer.')?.verdict === "reject",
  "JSON med snak omkring læses",
);
ok(extractJson("beklager, jeg kan ikke") === null, "et svar uden JSON giver null (og gemmes ikke)");

console.log(`\nfix-pack: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
