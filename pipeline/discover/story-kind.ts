/**
 * Historie-type på OVERSKRIFTS-niveau: kampreferat, forsæsons-notits, eller
 * noget tredje?
 *
 * Hvorfor modulet findes: rangeringen i både `build-factsheet` og
 * `generate-articles` er `relevance_score DESC`, og relevance_score var indtil
 * 2026-08-26 et rent NAVNE-match (maks 90 for fuldt navn) plus HONORS_BOOST
 * (+15). Det gjorde hædersbevisninger til 100 og dermed strukturelt bedre end
 * ethvert referat — hver eneste kørsel, ikke som tie-break. Med fem artikler
 * pr. kørsel betød det, at sæsonens kampreferater aldrig nåede frem, mens
 * kladdekøen fyldtes med "udtaget til preseason all-conference second team".
 * Mikkel, 2026-08-26: referaterne er dem der er værd at skrive; forsæsons-
 * notitserne er ikke gode nok.
 *
 * `looksLikeMatchStory()` i `generate/box-score.ts` stiller samme spørgsmål,
 * men om et FÆRDIGT faktaark — altså efter LLM-udtrækket. Rangeringen skal
 * ske FØR det, på overskrift + resumé alene, og detektoren her er derfor
 * regelbaseret (ingen LLM — se token-effektivitets-reglen).
 *
 * Vi RANGERER, vi filtrerer ikke. En forsæsons-notits kan stadig blive til en
 * artikel når der ikke er andet; den skal bare ikke gå forrest i køen.
 */

export type StoryKind = "recap" | "preseason" | "honor" | "other";

export interface StoryKindMatch {
  kind: StoryKind;
  /** Det ordrette uddrag der afgjorde det (til logging/debug). */
  phrase: string;
}

/**
 * Forsæson/spekulation: lister, målinger og forudsigelser FØR der er spillet.
 * Tjekkes FØRST, fordi "Preseason All-MVC" ellers ville tælle som en almindelig
 * hædersbevisning, og fordi en "watch list" ofte nævner et resultat fra i fjor.
 */
const PRESEASON_PATTERNS: RegExp[] = [
  /\bpre[-\s]?season\b/i,
  /\bwatch[-\s]?list\b/i,
  /\b(players?|teams?|newcomers?|forwards?|midfielders?|defenders?|goalkeepers?)\s+to\s+watch\b/i,
  /\b(picked|predicted|selected|tabbed|projected|slotted)\s+(to\s+finish\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d{1,2}(st|nd|rd|th))\b/i,
  /\bcoaches?\s+poll\b/i,
  /\bseason\s+(preview|outlook)\b/i,
  /\bpicked\s+to\s+win\b/i,
];

/**
 * Kampreferat: der SKAL være et udfald. En kampannoncering ("Soccer Hosts
 * A&M-International on Sunday Night") er bevidst ikke et referat — der er
 * endnu intet at referere, og et faktaark uden resultat er præcis den slags
 * tomme kladde vi ikke vil have.
 */
const RECAP_PATTERNS: RegExp[] = [
  // Scoreline: "2-0", "3 - 1", "2–2". To cifre nok; årstal fanges ikke, fordi
  // et bindestregs-årstalsinterval ("2025-26") har fire cifre først.
  /\b\d{1,2}\s*[-–]\s*\d{1,2}\b/,
  /\b(defeat|beat|top|down|edge|best|blank|stun|upset|out(?:last|duel|score))(s|ed)?\b/i,
  /\b(fall|drop|slip|succumb)(s)?\s+(to|at|in)\b/i,
  /\b(win|victory|loss|defeat|draw|tie|shutout|shut\s+out|sweep|comeback|rally|rallies|overtime|penalt(y|ies))\b/i,
  /\b(scores?|nets?|brace|hat[-\s]?trick|double[-\s]?double|triple[-\s]?double|career[-\s]high|game[-\s]winner|match[-\s]winner)\b/i,
  /\b(season|home|road)\s+opener\b/i,
  /\b(advance|clinch|qualif(y|ies)|eliminat(e|ed))(s|d)?\b/i,
];

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = re.exec(text);
    if (m) return m[0].trim();
  }
  return null;
}

/**
 * Klassificér en historie ud fra "<overskrift> <resumé>".
 *
 * Rækkefølgen er bindende: forsæson slår referat, fordi en watch list-notits
 * gerne citerer sidste sæsons målscore ("scored 11 goals in 2025") og dermed
 * ville ligne et referat.
 *
 * @param honor Resultatet af `detectHonor()` på samme tekst, hvis kalderen
 *   allerede har det — så vi ikke kører de samme regexp'er to gange.
 */
export function detectStoryKind(
  text: string | null | undefined,
  honor: boolean = false,
): StoryKindMatch {
  if (!text) return { kind: "other", phrase: "" };

  const preseason = firstMatch(text, PRESEASON_PATTERNS);
  if (preseason) return { kind: "preseason", phrase: preseason };

  const recap = firstMatch(text, RECAP_PATTERNS);
  if (recap) return { kind: "recap", phrase: recap };

  if (honor) return { kind: "honor", phrase: "" };

  return { kind: "other", phrase: "" };
}

/**
 * Referat-boost. +15 løfter et fuldt navne-match (90) til 100 og lægger
 * referatet forrest i begge køer — præcis den plads HONORS_BOOST havde før.
 */
export const RECAP_BOOST = 15;

/**
 * Forsæsons-straf. −25 sender et fuldt navne-match (90) ned på 65: stadig over
 * MIN_RELEVANCE_GENERATE (60), så notitsen KAN blive skrevet når køen er tom,
 * men aldrig foran et referat eller en rigtig hædersbevisning.
 *
 * Tallet er valgt så et efternavns-match (35) på en forsæsons-notits falder
 * under MIN_RELEVANCE (30) og slet ikke gemmes — dét er den svageste og mest
 * støjende kombination vi har.
 */
export const PRESEASON_PENALTY = 25;

/** Justering der lægges til navne-matchets score. Kappes af kalderen. */
export function relevanceAdjustment(kind: StoryKind): number {
  switch (kind) {
    case "recap": return RECAP_BOOST;
    case "preseason": return -PRESEASON_PENALTY;
    // En hædersbevisning i sæsonen ("Player of the Week") er ægte nyhed, men
    // skal ikke længere KØBE sig foran et referat. Neutral.
    case "honor": return 0;
    default: return 0;
  }
}
