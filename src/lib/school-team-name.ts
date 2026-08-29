/**
 * KERNE: holdnavnet — «Iona Gaels», «Ohio State Buckeyes».
 *
 * Mikkel, 2026-08-29: «since this is about athletes, say the sports name.
 * Miami Hurricanes, Ohio State Buckeyes, Oregon Ducks. Some have both male and
 * female versions (Minutemen/Minutewomen), so watch out for those.»
 *
 * Det løser tre ting på én gang: universitetet nævnes naturligt, atleten
 * knyttes til det hold hun faktisk repræsenterer, og sætningen har stadig
 * plads til by og delstat — «for the Iona Gaels in New Rochelle, New York».
 *
 * ⚠️ KØN ER EN FÆLDE. Ni skoler i vores data bærer begge navne i ét felt
 * («Stags and Athenas», «Statesmen & Lady Statesmen»), to har kun herrenavnet
 * selvom damerne hedder noget andet (UMass, Washington College), og resten
 * bruger ét navn til begge. Skriver vi «Minutemen» om en kvinde, er det en
 * påstand om et navngivent menneske — derfor: er navnet kønnet OG kønnet
 * ukendt, dropper vi holdnavnet helt. 270 af 2.588 aktive atleter mangler køn.
 */

/** Hvad holdet hedder for hhv. herrer og damer. Ens når skolen kun har ét navn. */
export interface TeamNames {
  men: string;
  women: string;
  /** Er navnet forskelligt for kønnene? Så må det ikke bruges uden køn. */
  gendered: boolean;
}

/**
 * Skoler hvor KUN herrenavnet står i basen, men damerne hedder noget andet.
 * Verificeret 2026-08-29. Lebanon Valley («Flying Dutchmen») og SNHU
 * («Penmen») bruger ÉT navn til begge og hører derfor ikke til her.
 */
const GENDER_SPLIT: Record<string, { men: string; women: string }> = {
  Minutemen: { men: "Minutemen", women: "Minutewomen" },
  Shoremen: { men: "Shoremen", women: "Shorewomen" },
};

/**
 * Læs `schools.nickname`. Basen skriver et delt navn på tre måder —
 * «A & B», «A and B» — og herrenavnet står altid først (verificeret på alle
 * ni forekomster: Stags and Athenas, Kingsmen and Regals, Yeomen and Yeowomen,
 * Lions and Lady Lions, Bisons & Lady Bisons …).
 */
export function parseNickname(nickname: string | null | undefined): TeamNames | null {
  const raw = (nickname ?? "").trim();
  if (!raw) return null;

  const split = raw.split(/\s+(?:&|and)\s+/i);
  if (split.length === 2) {
    const [men, women] = split.map((p) => p.trim());
    if (men && women) return { men, women, gendered: men !== women };
  }

  const known = GENDER_SPLIT[raw];
  if (known) return { ...known, gendered: true };

  return { men: raw, women: raw, gendered: false };
}

/**
 * Holdnavnet i sin fulde form: skolens brugsnavn + holdets navn.
 *
 * @param gender "m" | "f" | null — `athletes.gender`.
 * @returns "" når holdnavnet ikke kan bruges; kalderen falder tilbage på
 *   skolenavnet alene.
 */
export function teamName(
  schoolDisplayName: string,
  nickname: string | null | undefined,
  gender: string | null | undefined,
): string {
  const school = (schoolDisplayName ?? "").trim();
  if (!school) return "";

  const names = parseNickname(nickname);
  if (!names) return "";

  const g = (gender ?? "").trim().toLowerCase();
  if (names.gendered) {
    // Ukendt køn + kønnet navn = vi ved det ikke. Så siger vi det ikke.
    if (g !== "m" && g !== "f") return "";
    return `${school} ${g === "f" ? names.women : names.men}`;
  }

  return `${school} ${names.men}`;
}
