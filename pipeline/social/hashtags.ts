/**
 * Hashtags — kun til Bluesky, og kun fordi de virker DÉR.
 * =======================================================
 *
 * Målt/efterprøvet 2026-09-17, og forskellen mellem kanalerne er ikke en nuance:
 *
 *   Bluesky   ingen algoritmisk feed overhovedet. Hashtag-søgning og
 *             nøgleordsbaserede custom feeds er den eneste dør ind til et
 *             opslag for nogen der ikke allerede følger kontoen. Kun ~2,6 % af
 *             opslag på platformen bærer tags, så pladsen er tom.
 *   Instagram Mosseri har sagt det rent ud: hashtags forbedrer ikke reach. At
 *             følge et hashtag blev fjernet i december 2024, og der er loft på
 *             fem tags siden december 2025.
 *   Facebook  målt: 1 tag ≈ 593 interaktioner, 3-5 ≈ 416, 6-10 ≈ 307. Flere
 *             tags koster.
 *
 * Derfor får kun Bluesky tags. De andre kanaler ville betale i plads og
 * troværdighed for noget der ikke virker.
 *
 * ⚠️ **Et tag i ren tekst er INTET på Bluesky.** Uden en `tag`-facet i posten
 * er «#CollegeGolf» grå tekst, ikke et link, og det indekseres ikke som tag.
 * Facetterne bygges i `channels/bluesky.ts`; teksten her skal bare bære
 * tags'ene, og de to hører uadskilleligt sammen.
 */

/**
 * Sport → tag. Nøglerne er `athletes.sport`-sluggene som de står i D1.
 *
 * **Bevidst uden NCAA-præfiks.** Atleterne ligger i NCAA, NAIA OG NJCAA, og et
 * `#NCAAGolf` på en NJCAA-spiller ville være en påstand vi ikke kan holde —
 * samme regel som faktaarkene. «College» er sandt for dem alle.
 *
 * En sport uden opslag her får simpelthen intet sport-tag. Det er bedre end et
 * maskinlavet tag: `track-and-field` → «#TrackAndField» kan slås op, men
 * `swimming-and-diving` → «#SwimmingAndDiving» er ikke det tag nogen bruger.
 * Listen er kort nok til at vedligeholde i hånden.
 */
export const SPORT_TAGS: Record<string, string> = {
  soccer: "CollegeSoccer",
  "track-and-field": "CollegeTrack",
  golf: "CollegeGolf",
  tennis: "CollegeTennis",
  rowing: "CollegeRowing",
  "swimming-and-diving": "CollegeSwimming",
  "field-hockey": "FieldHockey",
  basketball: "CollegeBasketball",
  rugby: "CollegeRugby",
  football: "CollegeFootball",
  lacrosse: "CollegeLacrosse",
  "ice-hockey": "CollegeHockey",
  volleyball: "CollegeVolleyball",
  squash: "CollegeSquash",
  gymnastics: "CollegeGymnastics",
};

/**
 * Landets eget tag — nichen, ikke sporten.
 *
 * Det er her læserne faktisk er: «danskere i amerikansk collegesport» er en
 * lille, veldefineret gruppe, mens `#CollegeSoccer` er et hav. Tagget hører til
 * KONTOEN og dermed landet, på samme måde som kanalens `country`.
 */
export const COUNTRY_TAGS: Record<string, string> = {
  DK: "dansksport",
  UK: "BritsAbroad",
};

/**
 * Tags til ét opslag, i den rækkefølge de skal stå.
 *
 * Højst to: sporten og landet. Bluesky har 300 tegn i alt, og hvert tag er
 * tegn der ellers var beskrivelse — det er en ægte pris, ikke gratis rækkevidde.
 * Ukendt sport eller ukendt land springes over uden at vælte resten.
 */
export function hashtagsFor(sport: string | null | undefined, country: string | undefined): string[] {
  const tags: string[] = [];
  const sportTag = sport ? SPORT_TAGS[sport] : undefined;
  if (sportTag) tags.push(sportTag);
  const countryTag = country ? COUNTRY_TAGS[country.toUpperCase()] : undefined;
  if (countryTag) tags.push(countryTag);
  return tags;
}

/** Tags som de står i teksten: «#CollegeGolf #dansksport». Tom streng når der ingen er. */
export function hashtagLine(tags: string[]): string {
  return tags.map((t) => `#${t}`).join(" ");
}
