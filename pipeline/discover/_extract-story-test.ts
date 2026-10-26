/**
 * Test af markup-fjernelsen i discovery-matcheren.
 *
 * Kladde #107 (2026-08-16) blev til fordi `matchAthletes` fik RSS-feedets rå
 * `description` — inklusive `<img alt="Mackenzie Mackreth">`. Alt-teksten gav
 * fuldt navn = 90 point, selv om nyheden ikke nævnte hende med ét ord. Et navn
 * i en alt-tekst betyder "hun er på billedet", ikke "nyheden handler om hende".
 */
import { extractArticle, matchArticle, matchAthletes, stripMarkup } from "./extract-story";

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

// ── The article body (2026-10-26) ─────────────────────────────────────────
{
  const filler = " The Dons ran well at the invitational and the coaches were pleased with the depth of the squad this season.".repeat(3);
  // The new Sidearm layout: smarttags in the text, a «Players Mentioned» box, «Related News» cards.
  const nuxt = `<html><body>
<div class="storyContainer"><div class="storyPageContentBody"><p><dfn><a href="/sports/cross-country/roster/daniel-abramowicz/6579" rel="smarttag">Daniel Abramowicz</a></dfn> won the award after
<dfn><a href="/sports/cross-country/roster/herbie-johnson/6597" rel="smarttag">Herbie Johnson</a></dfn> won it last week. Along with Faustine Chaboche winning the women's award.${filler}</p></div></div>
<div class="s-people"><h2>Players Mentioned</h2><div><a href="/sports/cross-country/roster/lena-holm/1">Lena Holm 5' 6" Junior</a></div></div>
<div class="s-stories-module__wrapper"><h2>Related News</h2><a href="/news/x"><span>Poppy Martin Takes 11th At Bronco Invitational</span></a></div>
</body></html>`;
  const a = extractArticle(nuxt);
  eq(a.tagged.sort().join("|"), "Daniel Abramowicz|Herbie Johnson|Lena Holm", "smarttags and «Players Mentioned» are the school's tags");
  eq(a.text?.includes("Faustine Chaboche") ?? false, true, "the story text is read");
  eq(a.text?.includes("Poppy Martin") ?? true, false, "a related story's headline is not the story");
  const ours = [
    { id: 1, name: "Herbie Johnson", sport: "track-and-field" }, { id: 2, name: "Faustine Chaboche", sport: "track-and-field" },
    { id: 3, name: "Poppy Martin", sport: "track-and-field" }, { id: 4, name: "Lena Holm", sport: "track-and-field" },
  ];
  const m = matchArticle(a, ours).map((x) => `${x.athlete.id}:${x.relevance_score}`).join(" ");
  eq(m, "1:95 2:90 4:95", "tag 95, full name in the text 90, the sidebar's name nothing");

  // The classic layout: text in the story template, a box score with surnames only.
  const classic = `<html><body><div class="sidearm-story-template"><p>In the 36th minute, Tomas Petrungaro equalized as Samuel Marquez's pass was taken down.${filler}</p>
<table><tr><td>Assisted By: Suarez, Rodriguez</td></tr></table></div>
<div class="sidearm-story-template-next-game-promos">Next game vs Lucia Martin Invitational</div></body></html>`;
  const c = extractArticle(classic);
  const cm = matchArticle(c, [{ id: 7, name: "Samuel Marquez", sport: "soccer" }, { id: 8, name: "Curro Rodriguez", sport: "soccer" }, { id: 9, name: "Lucia Martin", sport: "golf" }])
    .map((x) => x.athlete.id).join(",");
  eq(cm, "7", "full name in the text; a surname in a box score or a promo is not a story");
}

console.log(`\nextract-story: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
