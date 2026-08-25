/**
 * KERNE: er to skolenavne det SAMME lærested?
 * ==========================================
 *
 * Baggrund (Mikkel, 2026-08-25): «it says he transfered from University of
 * North Carolina to University of North Carolina at Chapel Hill, which I
 * believe is the same thing.» Han havde ret. Roster-scraperen afgjorde
 * transfers med `existing.university !== check.name` — rå streng-ulighed — så
 * hver gang `schools.name` blev normaliseret til det officielle navn, blev
 * ALLE atleter på skolen logget som skiftere. 54 af 85 transfer-begivenheder
 * var navnevarianter (Ohio State → The Ohio State University, Saint → St.
 * Bonaventure, University of Texas → The University of Texas at Austin …).
 *
 * REGLEN ER BEVIDST ASYMMETRISK. Et falsk skifte er en påstand om et
 * navngivet menneske i en offentlig profiltekst; et overset skifte er en
 * manglende sætning. Derfor: er navnene i tvivl om at være samme sted, siger
 * vi SAMME sted (= ingen begivenhed). Det koster os ægte skift mellem en
 * hovedcampus og en satellit med samme rod ("University of North Carolina" →
 * "…at Pembroke"), og det er den rigtige pris at betale.
 *
 * Den rigtige kilde til skift er `athletes.previous_school` — skolens EGEN
 * oplysning (migration-045). Navnesammenligningen her er kun en spærre mod at
 * opfinde skift, ikke en detektor.
 */

/** Skolenavne-ord uden identitetsværdi. "state" står IKKE her med vilje:
 *  Ohio University og Ohio State University er to forskellige læresteder. */
const STOPWORDS = new Set([
  "the", "university", "universities", "college", "colleges",
  "of", "at", "in", "and", "campus",
]);

/** Forkortelser skolerne selv blander med det fulde navn. Hold listen kort og
 *  entydig — "usc" udelades bevidst (South Carolina OG Southern California). */
const ALIASES: Record<string, string> = {
  uc: "california", // "UC Davis" ↔ "University of California, Davis"
};

/**
 * Lærestedspar der ER samme atletikprogram under to navne, og som derfor
 * oscillerer i rosterne. De kan ikke udledes af navnene og står derfor her.
 */
const SAME_PROGRAM: ReadonlyArray<readonly [string, string]> = [
  // Coordinate colleges: ét fælles atletikprogram, herrer under Hobart,
  // damer under William Smith.
  ["hobart", "william smith"],
  // Vermont State University blev fusioneret 2023; campusserne deler navn.
  ["vermont state castleton", "vermont state johnson"],
];

/** Navn → identitets-tokens (små bogstaver, uden diakritik og fyldord). */
export function schoolTokens(raw: string): string[] {
  const flat = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/\bsaint\b/g, "st")
    .replace(/\bst\.?\b/g, "st")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return flat
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t))
    .map((t) => ALIASES[t] ?? t);
}

const isSubset = (a: Set<string>, b: Set<string>) => [...a].every((t) => b.has(t));

/** Postnummerkoder brugt som disambiguering: "Miami University" (Ohio) er ikke
 *  "University of Miami (FL)", og "Lincoln University (MO)" er sin egen skole. */
const US_STATE_CODES = new Set([
  "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia","ks",
  "ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj","nm","ny",
  "nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","vt","va","wa","wv",
  "wi","wy","dc",
]);

/**
 * Delmængde-matchet er for gavmildt i to tilfælde, hvor det EKSTRA ord bærer
 * identitet frem for at være en campus-angivelse:
 *
 *   · præcis ét ekstra ord, og det er "state" — Ohio University og Ohio State
 *     University er to forskellige skoler. Kravet om PRÆCIS ét ord er det der
 *     holder de ægte omdøbninger inde: "University of Vermont" →
 *     "…and State Agricultural College" har {state, agricultural}, og
 *     "University at Albany" → "State University of New York at Albany" har
 *     {state, new, york}.
 *   · kun delstatskoder tilbage — "Miami University" vs "University of Miami (FL)".
 */
function extraTokensCarryIdentity(diff: Set<string>): boolean {
  if (diff.size === 1 && diff.has("state")) return true;
  return diff.size > 0 && [...diff].every((t) => US_STATE_CODES.has(t));
}

/**
 * Er `a` og `b` det samme lærested? Sandt ved identiske tokensæt OG når det
 * ene navn er en forkortet form af det andet (delmængde) — det er formen
 * navnevarianterne har i praksis.
 */
export function sameInstitution(a: string | null, b: string | null): boolean {
  if (!a || !b) return true; // ukendt → antag samme, så vi ikke opfinder et skifte
  if (a === b) return true;

  const ta = new Set(schoolTokens(a));
  const tb = new Set(schoolTokens(b));
  if (ta.size === 0 || tb.size === 0) return true;
  if (isSubset(ta, tb) || isSubset(tb, ta)) {
    const [small, large] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
    const diff = new Set([...large].filter((t) => !small.has(t)));
    return !extraTokensCarryIdentity(diff);
  }

  const [na, nb] = [schoolTokens(a).join(" "), schoolTokens(b).join(" ")];
  return SAME_PROGRAM.some(
    ([x, y]) =>
      (na.includes(x) && nb.includes(y)) || (na.includes(y) && nb.includes(x)),
  );
}
