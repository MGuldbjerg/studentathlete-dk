/**
 * Test af rolletjekket. Hvert tilfælde er en ÆGTE kladde eller en ægte kilde
 * fra arkivet — filen indeholder ingen opfundne eksempler, for et opfundet
 * eksempel beviser kun at reglen matcher sig selv.
 */
import { numberRoleFindings, pairsIn, rankClaims, countBefore, minGamesPlayed } from "./number-roles";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

// ── Talparrets rolle ────────────────────────────────────────────────────────
ok(pairsIn("Holy Cross (3-1) will return home").every((p) => p.role === "record"), "(3-1) er en rekord");
ok(pairsIn("Niagara improves to 2-1-0 while Syracuse falls to 3-1-1")
  .every((p) => p.role === "record"), "tre led er altid en rekord");
ok(pairsIn("No. 19 Yale tops UAlbany 9-1")[0].role === "final", "«tops … 9-1» er et resultat");
ok(pairsIn("Chowan led 2-1 at half-time")[0].role === "interim", "en halvlegsstilling er ikke slutresultatet");
// U+2011 — kladde #237 skrev hele artiklen med hårde bindestreger.
ok(pairsIn("the 3‑1 victory over the Huskies").length === 1, "hård bindestreg læses som talpar");

// ── #237: sæsonrekorden gjort til kampens resultat ─────────────────────────
const macleanSource =
  "Holy Cross field hockey freshman Marianna MacLean was named Patriot League Midfielder and Rookie of the Week. " +
  "MacLean had a hand in all six of the Crusaders' goals this past weekend, recording her first two career goals and tacking on four assists. " +
  "MacLean's five assists leads the Patriot League, while her nine points ranks fourth. " +
  "Holy Cross (3-1) will return home to the Hart Turf Field on Friday, Sept. 11 when they welcome Stanford at 6 p.m.";

const maclean = numberRoleFindings({
  title: "Marianna MacLean shines as Patriot League midfielder and rookie of the week",
  content:
    "The team's website reports that MacLean was instrumental in the 3‑1 victory over the Huskies. " +
    "In addition, the four assists provided by MacLean lead the Patriot League. " +
    "MacLean's nine points place the athlete fourth in the Patriot League scoring chart.",
  factSheet: JSON.stringify({ result: { final_score: null }, event: { opponent: null } }),
  sourceText: macleanSource,
  athleteNames: ["Marianna MacLean"],
});
ok(maclean.some((f) => f.kind === "score_is_record" && f.claim === "3-1 som kampens resultat"),
  "3-1 er rekorden, ikke kampens resultat");
ok(maclean.some((f) => f.kind === "rank_number" && f.claim === "4 assists"), "fire assists bærer ikke ligaførslen — fem gør");
ok(!maclean.some((f) => f.claim.includes("9 points")), "ni point står rigtigt og flages ikke");

// Den rettede tekst skal gå fri.
ok(
  numberRoleFindings({
    title: "Marianna MacLean named Patriot League midfielder and rookie of the week",
    content:
      "Against Northeastern on Friday she assisted Holy Cross' first two goals and then scored the winner. " +
      "MacLean's five assists lead the Patriot League this season, and her nine points rank fourth.",
    factSheet: JSON.stringify({ result: { final_score: null }, event: { opponent: null } }),
    sourceText: macleanSource,
    athleteNames: ["Marianna MacLean"],
  }).length === 0,
  "den rettede artikel giver ingen fund",
);

// ── Andres tal er ikke atletens ────────────────────────────────────────────
// #233/#234: «Bassett led Rogers State with two shots» blev målt mod en anden
// spillers tal, fordi begge sætninger indeholdt ordet «shots».
ok(
  rankClaims("Eckerd goalkeeper Trent Murphy made six saves and led the conference.", ["bassett"]).size === 0,
  "en rangering om en anden spiller tælles ikke",
);
ok(countBefore("UT Tyler finished with a 9-7 edge in ") === null, "9-7 er et talpar, ikke 97 skud");
ok(countBefore("MacLean's five ") === 5, "skrevet tal foran størrelsen");
ok(countBefore("ranks fourth in ") === null, "placeringens ordenstal er ikke en optælling");

// ── Sæsonpremieren, som rekorden modsiger ──────────────────────────────────
const chowanSource = "Chowan (1-0-1, 0-0-0) drew with Concord on Saturday at Hawks Soccer Field.";
ok(
  numberRoleFindings({
    title: "Lucas Kibrya keeps clean sheet as Chowan draw with Concord",
    content: "The draw leaves Chowan unbeaten in their opening fixture of the season.",
    factSheet: JSON.stringify({ result: { final_score: null }, event: { opponent: "Concord" } }),
    sourceText: chowanSource,
    athleteNames: ["Lucas Kibrya"],
  }).some((f) => f.kind === "opener_vs_record"),
  "1-0-1 er to kampe — det er ikke sæsonpremieren",
);
// #192 og #214: en TIDLIGERE kamp må godt kaldes sæsonpremieren.
ok(
  numberRoleFindings({
    title: "Lucy Trinder scores first collegiate goal in Niagara's 2-1 win over Syracuse",
    content: "The victory follows a narrow 1-0 defeat to Cornell in the season opener.",
    factSheet: JSON.stringify({ result: { final_score: "2-1" }, event: { opponent: "Syracuse" } }),
    sourceText: "Niagara improves to 2-1-0 while Syracuse falls to 3-1-1 on the season.",
    athleteNames: ["Lucy Trinder"],
  }).length === 0,
  "«sejren følger et nederlag i sæsonpremieren» er korrekt og går fri",
);
ok(minGamesPlayed(pairsIn("Yale (2-0, 0-0 Ivy League)")) === 2, "0-0-konferencerekorden trykker ikke minimum ned");

// ── Ingen kilde, ingen dom ─────────────────────────────────────────────────
ok(numberRoleFindings({ title: "", content: "vandt 4-0", factSheet: null, sourceText: null }).length === 0,
  "uden kilde siger tjekket ingenting");

console.log(`\nnumber-roles: ${pass} bestået, ${fail} fejlet`);
if (fail > 0) process.exit(1);
