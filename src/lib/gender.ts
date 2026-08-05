/**
 * Atletens køn udledt af holdets URL.
 *
 * Hvorfor det overhovedet skal med: den første britiske kladde omtalte Almi
 * Nerurkar som "he" og placerede hende på Georgetowns HERREhold, fordi
 * kildeartiklen lå på skolens herre-sektion. Modellen havde intet at gå efter —
 * `athletes` havde ingen kønsoplysning — så den gættede ud fra kilden.
 *
 * NCAA-skolernes URL'er siger det derimod altid selv: `/sports/womens-soccer/`,
 * `/sports/m-tennis/`, `wbball`, `msoc`. Det er data, ikke gæt, og derfor
 * hører det i databasen frem for i en promptregel.
 *
 * Vi gemmer "f"/"m" (som i rosterens dame-/herrehold) og lader det være NULL
 * når URL'en ikke siger noget — fx idrætter med ét hold. NULL betyder "vi ved
 * det ikke", og prompten beder da modellen undgå stedord helt.
 */
export type Gender = "f" | "m";

/**
 * VIGTIGT: kvinde-mønstrene testes FØRST. "womens" indeholder "mens", så den
 * omvendte rækkefølge ville gøre hvert eneste damehold til et herrehold —
 * præcis den fejl der skabte behovet for denne fil.
 */
const FEMALE = [
  /\bw(?:o)?m[ae]n['’]?s?\b/i, // womens, women's, women, woman's
  /\/w-[a-z]/i, //   /w-tennis/
  /\bw(?:bball|bkb|bb|soc|vball|golf|swim|track|xc|lax|ten|row|gym|hoops)\b/i,
  /-women(?:s)?[-/]/i,
];

const MALE = [
  /\bm[ae]n['’]?s?\b/i, // mens, men's, men
  /\/m-[a-z]/i, //   /m-basketball/
  /\bm(?:bball|bkb|bb|soc|vball|golf|swim|track|xc|lax|ten|row|gym|hoops)\b/i,
  /-men(?:s)?[-/]/i,
];

/**
 * Første URL der siger noget, vinder. Giv gerne flere (bio-URL før roster-URL):
 * bio-URL'en peger på atletens EGET hold, mens en roster-URL kan være den
 * kandidat der tilfældigvis svarede.
 */
export function genderFromTeamUrl(...urls: (string | null | undefined)[]): Gender | null {
  for (const raw of urls) {
    if (!raw) continue;
    // Kun stien er interessant — et domæne som "womensports.com" må ikke tælle.
    let path = raw;
    try {
      path = new URL(raw).pathname;
    } catch {
      /* ikke en absolut URL — brug strengen som den er */
    }
    const hay = path.replace(/_/g, "-");
    if (FEMALE.some((re) => re.test(hay))) return "f";
    if (MALE.some((re) => re.test(hay))) return "m";
  }
  return null;
}

/** Stedord til promptens atlet-blok. `null` = modellen skal undgå stedord. */
export function pronounHint(gender: string | null | undefined, lang: string): string | null {
  const g = gender === "f" || gender === "m" ? gender : null;
  if (!g) return null;
  if (lang === "en") return g === "f" ? "she/her" : "he/him";
  return g === "f" ? "hun/hende" : "han/ham";
}
