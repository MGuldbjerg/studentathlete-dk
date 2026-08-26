/**
 * Honors-detektor: genkender ugentlige konference-hædersbevisninger
 * ("Player of the Week" m.fl.) i en nyhedsoverskrift/-tekst.
 *
 * Hvorfor: hædersbevisninger navngiver atleten og er knyttet til en navngiven
 * konference, så de er nemme at verificere. Detektoren bruges nu KUN til at
 * klassificere historien (se story-kind.ts) — den giver ikke længere et
 * relevance-boost.
 *
 * Boostet (HONORS_BOOST = 15) er fjernet 2026-08-26. Det løftede enhver
 * hædersbevisning til 100 og dermed forbi ethvert referat (maks 90), hver
 * eneste kørsel. Med fem artikler pr. kørsel betød det, at kladdekøen blev
 * forsæsons-notitser og aldrig kampreferater. Rangeringen ligger nu i
 * story-kind.ts, hvor referatet er det der boostes.
 *
 * Kilde: skolens eget nyhedsfeed (allerede overvåget i check-sources) — skolen
 * poster typisk selv "X kåret til Conference Player of the Week". Konference-feeds
 * (Sidearm /rss.aspx) kan tilføjes som backup via source_type 'conference'.
 *
 * Rent regelbaseret (ingen LLM) — se token-effektivitets-reglen.
 */

export type HonorType =
  | "all_american"
  | "all_conference"
  | "of_month"
  | "freshman_of_week"
  | "specialist_of_week"
  | "player_of_week";

export interface HonorMatch {
  type: HonorType;
  /** Det ordrette uddrag der udløste matchet (til logging/debug). */
  phrase: string;
}

/**
 * Mønstre i prioriteret rækkefølge: mest specifikke FØRST, så en
 * "Freshman of the Week" ikke fanges af det generiske "of the Week".
 */
const HONOR_PATTERNS: Array<{ type: HonorType; re: RegExp }> = [
  { type: "all_american", re: /\ball[-\s]?american\b/i },
  {
    type: "all_conference",
    re: /\ball[-\s]?(conference|big ten|big 12|acc|sec|league|american|sun belt|mountain west|ivy|patriot)\b/i,
  },
  {
    type: "of_month",
    re: /\b(player|athlete|pitcher|rookie|freshman|newcomer|scholar[-\s]?athlete)\s+of\s+the\s+month\b/i,
  },
  {
    type: "freshman_of_week",
    re: /\b(freshman|rookie|newcomer)\s+of\s+the\s+week\b/i,
  },
  {
    type: "specialist_of_week",
    re: /\b(pitcher|hitter|goalkeeper|keeper|defensive|offensive|special\s+teams|swimmer|diver|runner|setter|attacker|libero|scholar[-\s]?athlete)\s+(player\s+)?of\s+the\s+week\b/i,
  },
  {
    type: "player_of_week",
    re: /\b(player|athlete|performer|co[-\s]?player)\s+of\s+the\s+week\b/i,
  },
];

/**
 * Returnér det første honors-match i teksten, ellers null.
 * Tekst er typisk "<overskrift> <resumé>".
 */
export function detectHonor(text: string | null | undefined): HonorMatch | null {
  if (!text) return null;
  for (const { type, re } of HONOR_PATTERNS) {
    const m = re.exec(text);
    if (m) return { type, phrase: m[0].trim() };
  }
  return null;
}
