/**
 * Følsomheds-detektor: genkender historier i de kategorier hvor presseetikken
 * kræver EKSTRA omhu — anholdelser/sigtelser, holddisciplin, akademisk
 * spilleberettigelse og alvorlige personlige forhold (dødsfald, indlæggelse).
 *
 * Hvorfor: dækningen er normalt neutral/positiv (resultater, hæder), og dér er
 * forelæggelse unødvendig. Men skole-/holdfeeds kan alligevel surface negative
 * historier om navngivne unge mennesker. En flaget historie skal ALTID ses af Mikkel med
 * ekstra kritisk blik (rød FØLSOM-badge i admin), og genereringen får en
 * nøgternheds-instruks. Skader er BEVIDST ikke en kategori — objektiv
 * skadesdækning er normal sportsjournalistik (tidslinje-værn ligger i
 * system-prompt regel 23 + verify-article).
 *
 * Rent regelbaseret (ingen LLM) — se token-effektivitets-reglen.
 * Falske positiver er acceptable (koster kun et ekstra kritisk blik);
 * falske negativer er dyre. Mønstrene er dog værnet mod sports-idiomer
 * ("sudden death overtime", "years of eligibility remaining", "court").
 */

export type SensitiveType = "crime" | "discipline" | "eligibility" | "personal";

export interface SensitiveMatch {
  type: SensitiveType;
  /** Det ordrette uddrag der udløste matchet (til logging/badge-tooltip). */
  phrase: string;
}

/**
 * Mønstre i prioriteret rækkefølge — mest alvorlige først, så en historie med
 * både sigtelse og suspension flagges som 'crime'.
 * NB: "court" matches ALDRIG alene (basketball court), "sudden death" er
 * overtid, "years of eligibility" er rutine-roster-sprog.
 */
const SENSITIVE_PATTERNS: Array<{ type: SensitiveType; re: RegExp }> = [
  {
    type: "crime",
    re: /\b(arrest(?:ed|s)?|charged with|faces? charges|felony|misdemeanor|assault|dui|dwi|domestic violence|lawsuit|sued|guilty|plea(?:ds|ded)? (?:guilty|no contest)|indicted|jailed|police investigat\w*|criminal)\b/i,
  },
  {
    type: "discipline",
    re: /\b(suspend(?:ed|s|sion)|dismissed from|kicked off (?:the )?team|banned|violation of team rules|ncaa violation|sanction(?:ed|s)?|misconduct)\b/i,
  },
  {
    type: "eligibility",
    // KUN mistet spilleberettigelse — "two years of eligibility remaining" er rutine.
    re: /\b(academically ineligible|ruled ineligible|declared ineligible|ineligibility|academic probation|academic suspension|fail(?:ed|s) to qualify academically)\b/i,
  },
  {
    type: "personal",
    // Dødsfald/indlæggelse/mentalt helbred. IKKE "sudden death" (overtid i golf/hockey).
    re: /\b(pass(?:ed|es) away|dies at|died at|death of|mourns?|mourning|funeral|obituary|hospitalized|life-threatening|mental health|critical condition)\b/i,
  },
];

/**
 * Returnér det første (alvorligste) følsomheds-match i teksten, ellers null.
 * Tekst er typisk "<overskrift> <resumé>".
 */
export function detectSensitive(text: string | null | undefined): SensitiveMatch | null {
  if (!text) return null;
  // Værn: fjern kendte sports-idiomer FØR mønstermatch, så "sudden death
  // playoff" og "shootout" aldrig når death-mønstret.
  const cleaned = text.replace(/\bsudden[-\s]death\b/gi, "overtime");
  for (const { type, re } of SENSITIVE_PATTERNS) {
    const m = re.exec(cleaned);
    if (m) return { type, phrase: m[0].trim() };
  }
  return null;
}

/**
 * Nøgternheds-instruks der føjes til skrive-prompten når historien er flaget.
 * Holder tonen refererende og kildebundet — ingen spekulation, ingen dom.
 */
export function sensitiveCareBlock(type: SensitiveType): string {
  return [
    `FØLSOM HISTORIE (kategori: ${type}). Skærpede krav:`,
    "- Gengiv KUN hvad kilden eksplicit oplyser — ingen spekulation, ingen antydninger, ingen karakteristik af personen",
    "- Brug refererende sprog ('ifølge…', 'oplyser…', 'er sigtet for' — aldrig konstaterende skyld)",
    "- Ingen dramatiserende ordvalg; nøgtern nyhedssprog",
    "- Udelad detaljer om tredjeparter (familie, ofre) medmindre kilden selv navngiver dem som centrale",
    "- Er kilden uklar om fakta, så skriv mindre — udeladelse er altid rigtigt her",
  ].join("\n");
}
