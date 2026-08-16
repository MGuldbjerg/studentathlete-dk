/**
 * Test af markup-fjernelsen i discovery-matcheren.
 *
 * Kladde #107 (2026-08-16) blev til fordi `matchAthletes` fik RSS-feedets rå
 * `description` — inklusive `<img alt="Mackenzie Mackreth">`. Alt-teksten gav
 * fuldt navn = 90 point, selv om nyheden ikke nævnte hende med ét ord. Et navn
 * i en alt-tekst betyder "hun er på billedet", ikke "nyheden handler om hende".
 */
import { matchAthletes, stripMarkup } from "./extract-story";

let passed = 0;
let failed = 0;

function eq(actual: unknown, expected: unknown, name: string) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`✗ ${name}: fik ${JSON.stringify(actual)}, forventede ${JSON.stringify(expected)}`);
  }
}

// ── stripMarkup ─────────────────────────────────────────────────────────────
eq(stripMarkup('<img alt="Mackenzie Mackreth" src="/a.jpg" />'), "", "alt-tekst overlever ikke");
eq(stripMarkup("<p>Toke Amtrup scored</p>"), "Toke Amtrup scored", "brødtekst overlever");
eq(stripMarkup("<br /><br />OREM, Utah"), "OREM, Utah", "linjeskift-tags bliver til mellemrum");
eq(stripMarkup("A&amp;M-Corpus Christi"), "A&M-Corpus Christi", "&amp; afkodes");
eq(stripMarkup("Coaches&#39; Team"), "Coaches' Team", "&#39; afkodes");
eq(stripMarkup("5 &lt; 7 &gt; 3"), "5 < 7 > 3", "&lt;/&gt; afkodes efter tag-fjernelse");
eq(stripMarkup("<script>var name='Mackenzie Mackreth'</script>Kampen"), "Kampen", "script-indhold ryger med");
eq(stripMarkup("<style>.x{}</style> Ren tekst "), "Ren tekst", "style-indhold ryger med");
eq(stripMarkup(null), "", "null → tom streng");
eq(stripMarkup(undefined), "", "undefined → tom streng");
eq(stripMarkup(""), "", "tom streng");
eq(stripMarkup("Ingen markup her."), "Ingen markup her.", "ren tekst er uændret");
eq(stripMarkup("  dobbelt   mellemrum\n\nog linjeskift  "), "dobbelt mellemrum og linjeskift", "whitespace normaliseres");

// ── matchAthletes ───────────────────────────────────────────────────────────
const mackreth = { id: 601, name: "Mackenzie Mackreth", sport: "soccer" };
const amtrup = { id: 135, name: "Toke Amtrup", sport: "soccer" };

// Den virkelige RSS-post fra goislanders.com, 15. august 2026.
const kladde107Feed =
  "Soccer Hosts A&M-International on Sunday Night " +
  '<img alt="Mackenzie Mackreth" src="https://goislanders.com/common/controls/image_handler.aspx?image_path=/images/2026/8/15/DSC00297__1_.jpg" /><br /><br />' +
  "CORPUS CHRISTI, Texas – The Texas A&M-Corpus Christi soccer team gets right back on the pitch after a thrilling season opener during the week, " +
  "heading into action on its home turf against Texas A&M International on Sunday at 7 p.m. " +
  "https://goislanders.com/news/2026/8/15/soccer-hosts-am-international-on-sunday-night.aspx";

eq(matchAthletes(kladde107Feed, [mackreth]).length, 0, "kladde #107: intet match på alt-tekst alene");

// Samme feed, men nyheden nævner hende faktisk.
eq(
  matchAthletes(
    kladde107Feed.replace("The Texas A&M-Corpus Christi soccer team", "Mackenzie Mackreth and the Islanders"),
    [mackreth],
  )[0]?.relevance_score,
  90,
  "navnet i brødteksten giver fuldt-navn-score",
);

// Den rigtige historie skal stadig matche gennem sin egen markup.
eq(
  matchAthletes(
    "Amtrup named to Preseason Coaches' Team " +
      '<img alt="Toke Amtrup Big West Preseason Coaches&#39; Team" src="/images/Artboard_1.png" /><br /><br />' +
      "OREM, Utah — Utah Valley senior defender Toke Amtrup has been named to the Big West Preseason Coaches' Team.",
    [amtrup],
  )[0]?.relevance_score,
  90,
  "kladde #105 matcher stadig — navnet står i brødteksten",
);

console.log(`\nextract-story: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
