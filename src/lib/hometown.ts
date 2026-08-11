/**
 * KERNE: hører denne roster-hometown til et givet land?
 *
 * Algoritmen er sprog- og landefri — byerne, landenavnene og de kendte
 * false positives kommer fra landeprofilen (`src/lib/countries/`). Det var før
 * `isDanishHometown()` med listerne bagt ind i funktionen; et tysk site ville
 * have skullet kopiere hele logikken for at skifte bylisten ud.
 *
 * US-stat-listen bliver derimod HER: alle rosters er amerikanske, så
 * "afvis amerikanske adresser" er fælles for ethvert land vi indsamler for.
 */
import type { CountryProfile } from "./countries/types";

/**
 * US-stat-identifikatorer — bruges til at afvise US-adresser. Hver streng er
 * mellemrums-/tegnfri (samme normalisering som segmenterne nedenfor), så fulde
 * navne med mellemrum ("New York" → "newyork") matcher.
 */
const US_STATE_IDENTIFIERS = new Set([
  // 2-bogstavs forkortelser
  "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia",
  "ks","ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj",
  "nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","vt",
  "va","wa","wv","wi","wy","dc",
  // Uformelle forkortelser (roster-data bruger ofte disse)
  "ala","ariz","ark","calif","colo","conn","del","fla","ill","ind","kan",
  "ky","mich","minn","miss","mont","neb","nev","mex","dak","okla","ore",
  "penn","tenn","tex","vir","wash","wis","wisc","wyo",
  // Fulde statsnavne (mellemrum fjernet) — fanger rosters der staver staten ud,
  // fx "Lake Elsinore, California" eller "Denmark, Wisconsin".
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut",
  "delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa",
  "kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan",
  "minnesota","mississippi","missouri","montana","nebraska","nevada",
  "newhampshire","newjersey","newmexico","newyork","northcarolina","northdakota",
  "ohio","oklahoma","oregon","pennsylvania","rhodeisland","southcarolina",
  "southdakota","tennessee","texas","utah","vermont","virginia","washington",
  "westvirginia","wisconsin","wyoming",
  // Lande-/USA-markører
  "usa","unitedstates","us",
]);

/** Hele-ord-match (Unicode-bevidst, så ø/å/æ og ü/ñ brydes korrekt). */
function containsWholeWord(lowerHaystack: string, lowerNeedle: string): boolean {
  const escaped = lowerNeedle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, "u").test(lowerHaystack);
}

/** Byliste pr. profil, kun bygget én gang. */
const cityCache = new WeakMap<CountryProfile, string[]>();

function lowerCities(profile: CountryProfile): string[] {
  let cached = cityCache.get(profile);
  if (!cached) {
    cached = profile.cities.map((c) => c.toLowerCase());
    cityCache.set(profile, cached);
  }
  return cached;
}

/**
 * Peger en hometown-streng på det givne land?
 *
 * To signaler: (1) eksplicit landemarker ("Denmark"/"Danmark") som helt ord,
 * ELLER (2) en by fra profilen som helt ord. Begge filtreres først for kendte
 * false positives (Denmark, SC · Denmark HS) og for US-adresser, hvor staten
 * kan stå i et hvilket som helst komma-/skråstregs-segment:
 *   "Lake Elsinore, California"         → segment "california"
 *   "Lake Elsinore, CA / Centennial HS" → segment "ca"
 *   "Denmark, Wis. / Denmark"           → segment "wis"
 */
export function matchesCountry(hometown: string | null, profile: CountryProfile): boolean {
  if (!hometown) return false;
  const lower = hometown.toLowerCase().trim();

  if (profile.falsePositivePatterns.some((pattern) => pattern.test(lower))) return false;

  const segments = lower.split(/[,/]/).map((p) => p.replace(/[^a-z]/g, ""));
  if (segments.some((seg) => seg.length > 0 && US_STATE_IDENTIFIERS.has(seg))) return false;

  const hasMarker = profile.countryMarkers.some((marker) =>
    containsWholeWord(lower, marker.toLowerCase()),
  );
  if (hasMarker) return true;

  return lowerCities(profile).some((city) => containsWholeWord(lower, city));
}

/**
 * Hjembyen som den skal LÆSES af sitets læsere.
 *
 * To ting sker: skolens stavemåde slås op i landeprofilens `cityAliases`
 * ("Copenhagen" → "København", "Vaerloese" → "Værløse"), og landesuffikset
 * fjernes, fordi hvert nationalt site kun viser sit eget lands atleter —
 * ", Denmark" på det danske site er ren støj. Skolens rå tekst bliver stående
 * i `athletes.hometown`: den er dokumentationen for hvad kilden faktisk skrev.
 *
 * Segmenter der hverken er marker eller alias går uændret videre, så
 * "Kongens Lyngby" og ukendte forstæder aldrig forsvinder.
 */
export function localizeHometown(
  hometown: string | null | undefined,
  profile: CountryProfile,
): string {
  if (!hometown) return "";
  const markers = new Set(profile.countryMarkers.map((m) => m.toLowerCase()));
  const aliases = profile.cityAliases ?? {};

  return hometown
    .split(",")
    .map((seg) => seg.trim())
    .filter((seg) => seg.length > 0 && !markers.has(seg.toLowerCase()))
    .map((seg) => aliases[seg.toLowerCase()] ?? seg)
    .join(", ");
}

/**
 * Hvilket af de aktive lande hører atleten til? Returnerer landekoden til
 * `athletes.home_country`, eller null hvis ingen matcher.
 *
 * Første match vinder. Med flere lande i registret bør profiler med
 * overlappende byer (Malmö/København-typer) ordnes bevidst.
 */
export function classifyHometown(
  hometown: string | null,
  profiles: CountryProfile[],
): string | null {
  for (const profile of profiles) {
    if (matchesCountry(hometown, profile)) return profile.code;
  }
  return null;
}
