/**
 * Test af det mekaniske kvalitetstjek.
 *
 * Hvert tilfælde i første halvdel er en VIRKELIG kladde fra projektets historie,
 * som et menneske fangede — og som `verify-article.ts` ikke fangede:
 *
 *   #105 (Amtrup)   opdigtet alder «23-årige» og opdigtet kamptal «18 kampe»
 *   #107 (Mackreth) opdigtet cheftræner «Mark Carr» (han heder Daniel Clitnovici)
 *   #99             citat fra cheftræner Merritt, hvor faktaarket havde tomt `quotes`
 *   #101/#102       handlede om et ANDET menneske end atletbeskrivelsen
 *   Nerurkar        «he» om en kvindelig atlet
 *
 * Anden halvdel er lige så vigtig: en korrekt kladde må ikke drukne i falske fund.
 * Et tjek der flager alt, bliver ignoreret, og så er vi tilbage ved badgen der
 * ikke betød noget.
 */
import { checkDraft, severityOf, summarise, numbersIn, properNamesIn, quotesIn } from "./quality-check";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string) {
  if (cond) passed++;
  else { failed++; console.error(`✗ ${name}`); }
}
function eq(a: unknown, b: unknown, name: string) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x === y) passed++;
  else { failed++; console.error(`✗ ${name}\n    fik:      ${x}\n    forventet: ${y}`); }
}
const NOW = new Date("2026-08-19T08:00:00Z");
const cats = (fs: ReturnType<typeof checkDraft>) => fs.map((f) => f.category);

// ── Hjælperne ────────────────────────────────────────────────────────────────
eq(numbersIn("18 kampe, 3,5 point og 2-1"), ["18", "3.5", "2", "1"], "tal trækkes ud");
ok(properNamesIn("Cheftræner Mark Carr sagde").includes("Mark Carr"), "halen af et sætningsstart-match er med");
ok(properNamesIn("Han startede i august").length === 0, "almindelig dansk sætning giver ingen navne");
eq(quotesIn('Han sagde: «Vi spillede godt i dag».').length, 1, "typografisk citat");
eq(quotesIn("> Vi spillede godt i aften, sagde han").length, 1, "blockquote");

// ── #105: opdigtet alder og kamptal ──────────────────────────────────────────
const amtrup = checkDraft({
  title: "Toke Amtrup udvalgt til Big Wests preseasonhold",
  content:
    "Den 23-årige forsvarsspiller fra Svendborg startede alle 18 kampe sidste sæson " +
    "og er udvalgt til Big West Preseason Coaches' Team.",
  factSheet: JSON.stringify({
    stats: ["startede alle kampe", "eneste tilbagevendende i bagkæden"],
    quotes: [],
    placement: "Preseason Coaches' Team",
  }),
  sourceText:
    "Utah Valley defender Toke Amtrup has been named to the Big West Preseason Coaches' Team. " +
    "Amtrup, from Svendborg, Denmark, was the only returning starter in the back line.",
  athlete: { name: "Toke Amtrup", gender: "m", classYear: "Jr.", university: "Utah Valley University", hometown: "Svendborg, Denmark" },
  language: "da",
}, NOW);
ok(cats(amtrup).includes("numbers"), "#105: opdigtede tal flages");
ok(amtrup.some((f) => f.claim === "23"), "#105: alderen 23 flages");
ok(amtrup.some((f) => f.claim === "18"), "#105: kamptallet 18 flages");
eq(severityOf(amtrup), "high", "#105: samlet alvor = high");

// ── #107: opdigtet cheftræner ────────────────────────────────────────────────
const mackreth = checkDraft({
  title: "Mackenzie Mackreth klar til sæsonstart",
  content: "Cheftræner Mark Carr har fuld tillid til englænderen, skriver skolen.",
  factSheet: JSON.stringify({ quotes: [], stats: [] }),
  sourceText:
    "Texas A&M International visits the Islanders on Sunday evening. Head coach Daniel Clitnovici " +
    "has named his starting eleven.",
  athlete: { name: "Mackenzie Mackreth", gender: "f", classYear: "So.", university: "Texas A&M–Corpus Christi", hometown: "England" },
  language: "da",
}, NOW);
ok(mackreth.some((f) => f.category === "names" && f.claim === "Mark Carr"), "#107: den opdigtede træner flages");
ok(cats(mackreth).includes("identity"), "#107: fornavnet mangler i kilden → identitet flages");

// ── #99: citat uden belæg ────────────────────────────────────────────────────
const quoteCase = checkDraft({
  title: "Stærk optakt",
  content: 'Cheftræneren er tilfreds: «Hun har arbejdet hårdt hele sommeren, og det viser sig nu».',
  factSheet: JSON.stringify({ quotes: [], stats: ["udvalgt til preseason-holdet"] }),
  sourceText: "Merritt's squad opens the season at home. Anna Hansen was named to the preseason team.",
  athlete: { name: "Anna Hansen", gender: "f", classYear: "Jr.", university: "X", hometown: "Aarhus, Denmark" },
  language: "da",
}, NOW);
ok(cats(quoteCase).includes("quotes"), "#99: citat uden faktaark-belæg flages");

// ── Nerurkar: forkert stedord ────────────────────────────────────────────────
const pronoun = checkDraft({
  title: "Stærk debut",
  content: "Han løb sit hurtigste 5.000 meter-løb for Georgetown i weekenden.",
  factSheet: JSON.stringify({ quotes: [], stats: ["5.000 meter"] }),
  sourceText: "Almi Nerurkar ran a personal best over 5.000 meters for Georgetown.",
  athlete: { name: "Almi Nerurkar", gender: "f", classYear: "Fr.", university: "Georgetown University", hometown: "London, England" },
  language: "da",
}, NOW);
ok(cats(pronoun).includes("pronouns"), "Nerurkar: «han» om en kvinde flages");

// ── Regel 25: dimitterende atlet får fremskrevet en sæson ────────────────────
const senior = checkDraft({
  title: "Klar igen",
  content: "Han spiller en central rolle i den kommende sæson for holdet.",
  factSheet: JSON.stringify({ quotes: [], stats: ["udvalgt"] }),
  sourceText: "Senior Lars Jensen was honoured for his four years with the programme.",
  athlete: { name: "Lars Jensen", gender: "m", classYear: "Sr.", university: "X", hometown: "Aalborg, Denmark" },
  language: "da",
}, NOW);
ok(cats(senior).includes("class_year"), "Sr. + «den kommende sæson» flages");
eq(severityOf(senior), "medium", "årgang alene er medium, ikke high");

// ── Falske positiver: en KORREKT kladde skal være ren ────────────────────────
const clean = checkDraft({
  title: "Paul Claes Nielsen udvalgt til preseason-holdet",
  content:
    "Paul Claes Nielsen er udvalgt til Preseason All-MVC for Belmont. Danskeren spillede " +
    "31 kampe sidste sæson og scorede 4 mål. Han kommer fra København.\n\n" +
    "Holdet begynder sæsonen i august 2026.",
  factSheet: JSON.stringify({
    quotes: [],
    stats: ["31 games played", "4 goals", "Preseason All-MVC"],
    placement: "Preseason All-MVC",
  }),
  sourceText:
    "Belmont's Paul Claes Nielsen has been named Preseason All-MVC. The Copenhagen native " +
    "played 31 games and scored 4 goals last season.",
  athlete: { name: "Paul Claes Nielsen", gender: "m", classYear: "Jr.", university: "Belmont University", hometown: "Copenhagen, Denmark" },
  language: "da",
}, NOW);
eq(clean, [], "korrekt kladde giver INGEN fund");
eq(severityOf(clean), "low", "korrekt kladde = low");
eq(summarise(clean), "Ingen mekaniske fund.", "opsummering af en ren kladde");

// Sæsonår må ikke flages som opdigtede tal.
const seasonYears = checkDraft({
  title: "Sæsonen 2026-27",
  content: "Holdet ser frem mod 2026-27 efter en stærk sæson i 2026.",
  factSheet: JSON.stringify({ quotes: [], stats: ["stærk sæson"] }),
  sourceText: "The team looks ahead after a strong campaign.",
  athlete: { name: "Ida Poulsen", gender: "f", classYear: "So.", university: "X", hometown: "Odense, Denmark" },
  language: "da",
}, NOW);
eq(seasonYears.filter((f) => f.category === "numbers"), [], "sæsonår flages ikke");

// Skolens og turneringens navne står i kilden i længere form — det skal tælle.
const partialName = checkDraft({
  title: "Udvalgt",
  content: "Han er udvalgt til Big West efter en stærk sæson for Utah Valley.",
  factSheet: JSON.stringify({ quotes: [], stats: ["udvalgt"] }),
  sourceText: "The Big West Conference named the Utah Valley University defender to its team.",
  athlete: { name: "Toke Amtrup", gender: "m", classYear: "Jr.", university: "Utah Valley University", hometown: "Svendborg, Denmark" },
  language: "da",
}, NOW);
eq(partialName.filter((f) => f.category === "names"), [], "delnavne der findes i kilden flages ikke");

// Dansk genitiv: atletens eget navn må ikke flages (falsk fund på #108).
const genitiv = checkDraft({
  title: "Paul Claes Nielsen udvalgt",
  content: "Claes Nielsens fem assists var afgørende for Belmonts offensiv, og Bruins' mål kom efter hans oplæg.",
  factSheet: JSON.stringify({ quotes: [], stats: ["team-leading five assists"] }),
  sourceText: "Belmont's Paul Claes Nielsen had a team-leading five assists for the Bruins.",
  athlete: { name: "Paul Claes Nielsen", gender: "m", classYear: "So.", university: "Belmont University", hometown: "Copenhagen, Denmark" },
  language: "da",
}, NOW);
eq(genitiv.filter((f) => f.category === "names"), [], "genitiv af eget navn, skole og hold flages ikke");

// Engelsk kladde: stedord på engelsk.
const en = checkDraft({
  title: "Strong start",
  content: "She impressed for the Bulldogs in her opening match.",
  factSheet: JSON.stringify({ quotes: [], stats: ["opening match"] }),
  sourceText: "George Smith impressed for the Bulldogs in the opener.",
  athlete: { name: "George Smith", gender: "m", classYear: "Jr.", university: "X", hometown: "Leeds, England" },
  language: "en",
});
ok(cats(en).includes("pronouns"), "engelsk: «she» om en mand flages");

// Opsummering skal være læsbar i én linje.
ok(summarise(amtrup).includes("tal uden kilde"), "opsummering navngiver kategorien");

console.log(`\n${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
