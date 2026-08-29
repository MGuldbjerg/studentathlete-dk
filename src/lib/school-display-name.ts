/**
 * KERNE: hvilket navn SKRIVER vi, når vi nævner en skole?
 * =======================================================
 *
 * Baggrund (Mikkel, 2026-08-29): «a school could have multiple names —
 * University of North Carolina vs University of North Carolina at Chapel Hill.
 * Make sure we use the common name.»
 *
 * `schools.common_name` findes og er udfyldt for alle 1.761 skoler, men INTET
 * på sitet læste den: profilteksten skrev `athletes.university`, altså det
 * formelle registernavn. Derfor stod der «University of North Carolina at
 * Chapel Hill» og «The University of Vermont and State Agricultural College».
 *
 * ⚠️ REGLEN KAN IKKE VÆRE MEKANISK. At klippe alt efter «at» ville lave
 * University of Alabama at Birmingham om til «University of Alabama» — to
 * forskellige læresteder. Det samme gælder UNC Asheville, ULM og UNC Pembroke.
 * At forkorte forkert er en påstand om HVOR et navngivet menneske studerer.
 * Derfor: kurateret tabel, og ellers det officielle navn uændret. Vi gætter
 * aldrig (jf. regel 5 i ARKITEKTUR-motor.md).
 *
 * `school-name.ts` svarer på «er A og B samme sted?» (transfers). Denne fil
 * svarer på «hvad kalder vi stedet?». De to må ikke blandes sammen.
 */

/**
 * Kuraterede navne. KUN poster jeg har verificeret mod NCAA.com, skolens eget
 * atletiksite eller Wikipedia (2026-08-29) — resten beholder deres officielle
 * navn, som er langt men aldrig forkert.
 *
 * Nøglen er `schools.name` ordret, fordi det er den streng `athletes.university`
 * bærer.
 */
const OVERRIDES: Record<string, string> = {
  // Mangled af seed-scriptets `replace(/ University| College/g, "")`:
  // «State of New York at Canton» er ikke et sted.
  "State University of New York at Canton": "SUNY Canton",
  "State University of New York at Cortland": "SUNY Cortland",
  "University of Virginia's College at Wise": "UVA Wise",
  "California State University, Los Angeles": "Cal State LA",
  "California State University, Stanislaus": "Stanislaus State",
  "California State University, East Bay": "Cal State East Bay",
  "California State Polytechnic University, Pomona": "Cal Poly Pomona",
  "Minnesota State University, Mankato": "Minnesota State",
  "Claremont McKenna College, Harvey Mudd College, and Scripps College":
    "Claremont-Mudd-Scripps",
  "Auburn University at Montgomery": "Auburn Montgomery",

  // Aldrig forkortet af seed-scriptet — stod med hele registernavnet:
  "University of Illinois at Springfield": "UIS",
  "University at Albany": "UAlbany",
  "University of California, Davis": "UC Davis",
  "University of Nebraska at Kearney": "Nebraska-Kearney",
  "University of Pittsburgh at Johnstown": "Pitt-Johnstown",
  "University of Texas at Tyler": "UT Tyler",
  "University of North Carolina at Pembroke": "UNC Pembroke",
  "University of Alabama in Huntsville": "UAH",
};

/**
 * Ser `common_name` ud til at være ødelagt af seed-scriptets ord-strip?
 *
 * Scriptet fjerner « University» og « College» overalt i navnet, hvilket
 * efterlader sætningsrester: «State of New York at …», «University of
 * Virginia's at Wise». Sådan et navn må ALDRIG vises — så hellere det lange,
 * officielle navn.
 */
export function looksMangled(commonName: string): boolean {
  const n = commonName.trim();
  if (!n) return true;
  if (/^(of|at|and|the)\b/i.test(n)) return true;        // begynder midt i en sætning
  if (/^State of\b/i.test(n)) return true;                // "State University of NY" strippet
  if (/\b(of|at|in|and)$/i.test(n)) return true;          // ender på et bindeord
  if (/'s (at|in)\b/i.test(n)) return true;               // "Virginia's at Wise"
  return false;
}

/**
 * Navnet vi skriver. Rækkefølgen er bevidst:
 *   1. kurateret override (verificeret)
 *   2. skolens `common_name`, hvis den ser hel ud
 *   3. det officielle navn — langt, men aldrig forkert
 */
export function displaySchoolName(
  officialName: string | null | undefined,
  commonName?: string | null,
): string {
  const official = (officialName ?? "").trim();
  if (!official) return "";

  const override = OVERRIDES[official];
  if (override) return override;

  // Nogle rækker bærer to skrivemåder i ét felt: «UMass / Massachusetts»,
  // «Army / Army West Point». Den første er den primære — ellers stod der
  // «for UMass / Massachusetts in Massachusetts».
  const common = (commonName ?? "").split("/")[0].trim();
  if (common && !looksMangled(common)) return common;

  return official;
}

/**
 * Navngiver skolenavnet allerede delstaten? Så skal «i {delstat}» udelades.
 *
 * Uden det bliver den kurerede forkortelse til noget pjattet: «North Carolina
 * in North Carolina», «Texas in Texas», «California in California». Det er
 * prisen for at bruge sportsverdenens korte navne, og den betales her.
 */
export function nameContainsState(displayName: string, stateName: string): boolean {
  if (!displayName || !stateName) return false;
  // KUN når navnet ER delstaten. «Ohio State i Ohio» er to forskellige ting og
  // helt i orden; det er «Texas i Texas» der er pjattet. Sammenligningen
  // ignorerer tegnsætning, så «Hawaiʻi» og «Hawaii» tæller som samme ord.
  const flat = (v: string) => v.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  if (flat(displayName) === flat(stateName)) return true;
  // Disambiguerende parentes: «Miami (Florida) i Florida» siger det samme to
  // gange. Er parentesen delstaten, bærer navnet den allerede.
  const paren = /\(([^)]+)\)\s*$/.exec(displayName.trim());
  return paren ? flat(paren[1]) === flat(stateName) : false;
}
