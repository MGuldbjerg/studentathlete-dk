/**
 * Faktaark der tilskriver ATLETEN en anden persons kendsgerning.
 *
 * Fundet 2026-08-29 på kladde #162: Victor Moercks faktaark bar
 * «Fifth-year student». Det er Raphael Bartells egenskab i kilden — «Fifth-year
 * student Raphael Bartell recorded a save and an assist» — og vores egen roster
 * siger `Sr.` om Moerck. Fase 1 flyttede altså en oplysning fra én navngiven
 * person til en anden, og fase 2 skrev videre på den.
 *
 * ⚠️ Det er en ANDEN fejlklasse end den vi hidtil har vogtet. Citatvagten og
 * `verify-article` måler artiklen mod faktaarket — men her ER artiklen dækket
 * af sit faktaark. Fejlen sad i grundsandheden selv, og så er der ingen
 * nedstrøms kontrol der kan fange den.
 *
 * Kontrollen sammenligner derfor faktaarket med DET VI SELV VED om atleten:
 * årgangen fra rosteren. Den beviser ikke at faktaarket er forkert — men et
 * faktaark der siger «fifth-year» om en `Sr.` er værd at kigge på, og et der
 * mis-tilskriver ÉN kendsgerning kan ikke bruges som grundlag for de øvrige.
 */

/** Årgangsord i kilden → den roster-kode de svarer til. */
const CLASS_TERMS: Array<{ re: RegExp; codes: string[]; label: string }> = [
  { re: /\bfifth[-\s]?year\b|\b5th[-\s]?year\b/i, codes: ["Gr.", "R-Sr."], label: "fifth-year" },
  { re: /\bgraduate student\b|\bgrad student\b/i, codes: ["Gr."], label: "graduate" },
  { re: /\bsenior\b/i, codes: ["Sr.", "R-Sr."], label: "senior" },
  { re: /\bjunior\b/i, codes: ["Jr.", "R-Jr."], label: "junior" },
  { re: /\bsophomore\b/i, codes: ["So.", "R-So."], label: "sophomore" },
  { re: /\bfreshman\b|\bfirst[-\s]?year\b/i, codes: ["Fr.", "R-Fr.", "Fy.", "FY"], label: "freshman" },
];

/**
 * Steder hvor et årgangsord IKKE er en påstand om atleten. Uden dem larmer
 * kontrollen: to af de tre første fund var «Big South Freshman of the Year»
 * (en prisens navn) og «must be a sophomore, junior or senior» (en
 * berettigelsesregel). Et overvågningsværktøj man lærer at ignorere, er værre
 * end ingen.
 */
const NOT_A_CLAIM: RegExp[] = [
  // Prisnavne: «Freshman of the Year», «Senior CLASS Award», «All-Freshman».
  /\b(freshman|sophomore|junior|senior)\s+(of\s+the\s+(year|week|month)|class\s+award|bowl)\b/gi,
  /\ball[-\s](freshman|american|conference|region|state)\b/gi,
  // Begivenheder: «Senior Night», «Senior Day».
  /\bsenior\s+(night|day|salute|recognition)\b/gi,
  // Regeltekst: to eller flere årgange stillet op som alternativer.
  /\b(freshman|sophomore|junior|senior)\b[^.]{0,40}\bor\s+(a\s+)?(freshman|sophomore|junior|senior)\b/gi,
];

/** Fjern de steder hvor ordet ikke siger noget om ATLETEN. */
function stripNonClaims(text: string): string {
  return NOT_A_CLAIM.reduce((acc, re) => acc.replace(re, " "), text);
}

export interface AttributionFlag {
  /** Ordet i faktaarket, fx "fifth-year". */
  claimed: string;
  /** Det rosteren siger, fx "Sr.". */
  roster: string;
}

/**
 * Modsiger faktaarket rosterens årgang?
 *
 * Kun ord der faktisk står i faktaarket tælles, og kun når rosteren HAR en
 * årgang at sammenligne med — uden den ved vi ingenting og siger ingenting.
 */
export function classYearConflict(
  factSheetText: string | null | undefined,
  rosterClassYear: string | null | undefined,
): AttributionFlag | null {
  const text = stripNonClaims((factSheetText ?? "").trim());
  const roster = (rosterClassYear ?? "").trim();
  if (!text || !roster) return null;

  for (const { re, codes, label } of CLASS_TERMS) {
    if (!re.test(text)) continue;
    // Rosteren siger noget der PASSER med ordet → ingen konflikt.
    if (codes.some((c) => c.toLowerCase() === roster.toLowerCase())) return null;
    return { claimed: label, roster };
  }
  return null;
}
