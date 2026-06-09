/**
 * Syntetiske, men realistiske fixtures så backtesten kan køre NU — offline, uden
 * netværk/LLM/CF-creds. HTML'en efterligner Sidearm-struktur nok til at findBoxScoreUrl
 * og extractMainText virker. ERSTAT med rigtige in-season-snapshots via RECORD MODE
 * (se README) når sæsonen kører — strukturen er identisk.
 */
import type { Fixture } from "./types";

const recapWithBoxScore = (boxHref: string, body: string) => `<!doctype html><html><body>
  <article>
    <h1>Match Recap</h1>
    <p>${body}</p>
    <nav class="recap-links">
      <a href="/sports/schedule">Schedule</a>
      <a href="${boxHref}">Box Score</a>
      <a href="/news">More news</a>
    </nav>
  </article>
</body></html>`;

const recapNoBoxScore = (body: string) => `<!doctype html><html><body>
  <article>
    <h1>Match Recap</h1>
    <p>${body}</p>
    <nav class="recap-links">
      <a href="/sports/schedule">Schedule</a>
      <a href="/results">Final Results</a>
    </nav>
  </article>
</body></html>`;

// NB: extractMainText returnerer kun tekst > 200 tegn (ellers null), så box-score-siden
// padmes med realistisk summarytekst — ellers bailer enrichFactSheetWithBoxScore før LLM'en.
const boxScorePage = (body: string) => `<!doctype html><html><body>
  <main>
    <h1>Official Box Score</h1>
    <p>Full statistical summary of the completed contest, including individual player stat lines,
       team totals, period-by-period scoring, attendance figures and game officials. ${body}</p>
    <p>${body} Box score provided by the host institution's athletics department.</p>
  </main>
</body></html>`;

export const FIXTURES: Fixture[] = [
  // 1) NORMAL — box-score-link findes, atleten står på siden → stats flettes, low risk.
  {
    id: "normal-volleyball",
    kind: "normal",
    athleteName: "Mads Sørensen",
    sport: "volleyball",
    university: "University of California, Irvine",
    hometown: "Aarhus, Denmark",
    sourceUrl: "https://ucirvinesports.com/news/2024/11/2/recap",
    recapHtml: recapWithBoxScore(
      "/sports/mens-volleyball/boxscore/8842",
      "UC Irvine beat CSUN in four sets. The Danish middle blocker anchored the front line all night and was a constant threat at the net.",
    ),
    boxScoreHtml: boxScorePage(
      "Mads Sørensen: 12 kills, 2 blocks. Final: UC Irvine 3, CSUN 1.",
    ),
    llm: {
      // Faktaark: kvalitativt fra recap'en, ingen tal (box scoren leverer dem).
      factsheet: JSON.stringify({
        has_substance: true,
        event: { type: "kamp", date: null, opponent: "CSUN", competition: null },
        result: { final_score: null, outcome: "sejr", placement: null },
        stats: [],
        qualitative: [{ text: "anchored the front line; constant threat at the net", source: "prose" }],
        quotes: [],
        other_facts: [],
        box_score_url: null,
      }),
      boxScore: JSON.stringify({
        found: true,
        final_score: "UC Irvine 3, CSUN 1",
        stat_line: ["12 kills", "2 blocks"],
      }),
      article: `# Sørensen styrede nettet i Irvine-sejr
> Den danske midterblokering var altafgørende, da UC Irvine vandt 3-1 over CSUN.
Mads Sørensen leverede 12 kills og 2 blocks, da UC Irvine slog CSUN med 3-1. Den danske midterblokering var en konstant trussel ved nettet hele kampen.`,
      verify: JSON.stringify({ fabrication_risk: "low", flags: [] }),
    },
    expected: {
      linkDetected: "https://ucirvinesports.com/sports/mens-volleyball/boxscore/8842",
      finalScore: "UC Irvine 3, CSUN 1",
      statLine: ["12 kills", "2 blocks"],
      fabricationRisk: "low",
    },
  },

  // 2) NO BOX-SCORE LINK — recap uden link → berigelse skipper, ingen opdigtede tal.
  {
    id: "no-link-soccer",
    kind: "no_boxscore_link",
    athleteName: "Frederik Holm",
    sport: "fodbold",
    university: "Indiana University",
    hometown: "Odense, Denmark",
    sourceUrl: "https://iuhoosiers.com/news/2024/10/14/recap",
    recapHtml: recapNoBoxScore(
      "Indiana drew at home. The Danish midfielder controlled the tempo and created several chances from deep.",
    ),
    boxScoreHtml: "", // ingen — bruges aldrig (findBoxScoreUrl returnerer null)
    llm: {
      factsheet: JSON.stringify({
        has_substance: true,
        event: { type: "kamp", date: null, opponent: null, competition: null },
        result: { final_score: null, outcome: "uafgjort", placement: null },
        stats: [],
        qualitative: [{ text: "controlled the tempo; created several chances from deep", source: "prose" }],
        quotes: [],
        other_facts: [],
        box_score_url: null,
      }),
      article: `# Holm dirigerede midtbanen i uafgjort kamp
> Den danske midtbanespiller styrede tempoet, da Indiana spillede uafgjort.
Frederik Holm kontrollerede tempoet og skabte flere chancer fra dybden, da Indiana spillede uafgjort på hjemmebane. Universitetets hjemmeside fremhævede hans rolle i opspillet.`,
      verify: JSON.stringify({ fabrication_risk: "low", flags: [] }),
    },
    expected: {
      linkDetected: null,
      finalScore: null,
      statLine: [],
      fabricationRisk: "low",
    },
  },

  // 3) ATHLETE ABSENT — box-score-link findes, men atleten står ikke på siden → ingen tal.
  {
    id: "athlete-absent-basketball",
    kind: "athlete_absent",
    athleteName: "Oliver Bach",
    sport: "basketball",
    university: "Davidson College",
    hometown: "Copenhagen, Denmark",
    sourceUrl: "https://davidsonwildcats.com/news/2024/12/1/recap",
    recapHtml: recapWithBoxScore(
      "/sports/mens-basketball/boxscore/5511",
      "Davidson won at home. The Danish guard saw limited minutes off the bench.",
    ),
    boxScoreHtml: boxScorePage(
      "Starters and rotation players listed. (This athlete did not appear in the box score.)",
    ),
    llm: {
      factsheet: JSON.stringify({
        has_substance: true,
        event: { type: "kamp", date: null, opponent: null, competition: null },
        result: { final_score: null, outcome: "sejr", placement: null },
        stats: [],
        qualitative: [{ text: "limited minutes off the bench", source: "prose" }],
        quotes: [],
        other_facts: [],
        box_score_url: null,
      }),
      // Atleten findes ikke i box scoren → found=false → ingen merge.
      boxScore: JSON.stringify({ found: false, final_score: null, stat_line: [] }),
      article: `# Bach fik begrænset spilletid i Davidson-sejr
> Den danske guard kom ind fra bænken, da Davidson vandt på hjemmebane.
Oliver Bach fik begrænset spilletid fra bænken i Davidsons hjemmesejr. Ingen individuelle tal er rapporteret.`,
      verify: JSON.stringify({ fabrication_risk: "low", flags: [] }),
    },
    expected: {
      linkDetected: "https://davidsonwildcats.com/sports/mens-basketball/boxscore/5511",
      finalScore: null,
      statLine: [],
      fabricationRisk: "low",
    },
  },

  // 4) CONTRADICTING NUMBER — artiklen påstår et resultat der modsiger box scoren → high.
  {
    id: "contradicting-basketball",
    kind: "contradicting_number",
    athleteName: "Victor Lund",
    sport: "basketball",
    university: "Duke University",
    hometown: "Aalborg, Denmark",
    sourceUrl: "https://goduke.com/news/2025/1/18/recap",
    recapHtml: recapWithBoxScore(
      "/sports/mens-basketball/boxscore/9001",
      "Duke held on for a narrow home win. The Danish forward contributed off the bench.",
    ),
    boxScoreHtml: boxScorePage("Victor Lund: 8 points, 4 rebounds. Final: Duke 80, UNC 78."),
    llm: {
      factsheet: JSON.stringify({
        has_substance: true,
        event: { type: "kamp", date: null, opponent: "UNC", competition: null },
        result: { final_score: null, outcome: "sejr", placement: null },
        stats: [],
        qualitative: [{ text: "contributed off the bench", source: "prose" }],
        quotes: [],
        other_facts: [],
        box_score_url: null,
      }),
      boxScore: JSON.stringify({
        found: true,
        final_score: "Duke 80, UNC 78",
        stat_line: ["8 points", "4 rebounds"],
      }),
      // Artiklen PÅSTÅR 90-78 — modsiger box scorens 80-78 (opdigtet tal).
      article: `# Lund med i tæt Duke-sejr
> Den danske forward bidrog fra bænken, da Duke vandt 90-78 over UNC.
Victor Lund scorede 8 point og tog 4 rebounds, da Duke vandt 90-78 over ærkerivalen UNC.`,
      verify: JSON.stringify({
        fabrication_risk: "high",
        flags: ["Artiklen siger 90-78; box scoren siger 80-78"],
      }),
    },
    expected: {
      linkDetected: "https://goduke.com/sports/mens-basketball/boxscore/9001",
      finalScore: "Duke 80, UNC 78",
      statLine: ["8 points", "4 rebounds"],
      fabricationRisk: "high",
    },
  },
];
