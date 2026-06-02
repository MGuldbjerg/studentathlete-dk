/**
 * Danske byer og lande-markører til identifikation af danske atleter på rosters.
 * Listen dækker de 100 største byer plus varianter (engelsk/dansk stavning).
 */

export const DANISH_COUNTRY_MARKERS = [
  "Denmark",
  "Danmark",
];

export const DANISH_CITIES: string[] = [
  // Top 50 byer efter befolkning
  "Copenhagen",
  "København",
  "Aarhus",
  "Århus",
  "Odense",
  "Aalborg",
  "Ålborg",
  "Esbjerg",
  "Randers",
  "Kolding",
  "Horsens",
  "Vejle",
  "Roskilde",
  "Herning",
  "Silkeborg",
  "Næstved",
  "Fredericia",
  "Viborg",
  "Køge",
  "Holstebro",
  "Taastrup",
  "Slagelse",
  "Hillerød",
  "Holbæk",
  "Sønderborg",
  "Svendborg",
  "Hjørring",
  "Frederikshavn",
  "Nørresundby",
  "Ringsted",
  "Haderslev",
  "Skive",
  "Sæby",
  "Thisted",
  "Nykøbing Falster",
  "Nykøbing Mors",
  "Helsingør",
  "Elsinore",
  "Birkerød",
  "Farum",
  "Frederiksberg",
  "Gentofte",
  "Lyngby",
  "Ballerup",
  "Glostrup",
  "Albertslund",
  "Hvidovre",
  "Brøndby",
  "Ishøj",
  "Greve",
  // 50-100
  "Aabenraa",
  "Åbenrå",
  "Middelfart",
  "Nyborg",
  "Kerteminde",
  "Assens",
  "Faaborg",
  "Rønne",
  "Nakskov",
  "Maribo",
  "Vordingborg",
  "Kalundborg",
  "Sorø",
  "Ribe",
  "Tønder",
  "Varde",
  "Vejen",
  "Brønderslev",
  "Hobro",
  "Grenaa",
  "Grenå",
  "Skanderborg",
  "Hedensted",
  "Ikast",
  "Brande",
  "Struer",
  "Lemvig",
  "Ringkøbing",
  "Skjern",
  "Frederikssund",
  "Frederiksværk",
  "Gilleleje",
  "Hundested",
  "Charlottenlund",
  "Klampenborg",
  "Hellerup",
  "Valby",
  "Vanløse",
  "Brønshøj",
  "Amager",
  "Kastrup",
  "Dragør",
  "Hørsholm",
  "Rudersdal",
  "Allerød",
  "Solrød",
  "Ølstykke",
  "Stenløse",
  "Smørum",
  "Hedehusene",
  "Rødovre",
];

/**
 * Kendte false positives: US-steder der indeholder "Denmark".
 * Denmark, SC (by i South Carolina), Denmark HS (high school i Georgia),
 * Denmark, WI (by i Wisconsin), osv.
 */
const FALSE_POSITIVE_PATTERNS = [
  /denmark,?\s*(sc|wi|me|ms|tn|ga|al)\b/i,  // Denmark + US-stat-forkortelse
  /denmark\s+(hs|high|h\.s\.|academy|school|prep)/i,  // Denmark High School
  /\b(ga|sc|wi|me)\b.*denmark/i,  // US-stat før Denmark
];

/** US-stat-identifikatorer — bruges til at afvise US-adresser (modulniveau, genbruges). */
const US_STATE_IDENTIFIERS = new Set([
  // 2-bogstavs forkortelser
  "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia",
  "ks","ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj",
  "nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","vt",
  "va","wa","wv","wi","wy","dc",
  // Uformelle forkortelser (roster-data bruger ofte disse)
  "ala","ariz","ark","calif","colo","conn","del","fla","ill","ind","kan",
  "ky","mich","minn","miss","mont","neb","nev","mex","dak","okla","ore",
  "penn","tenn","tex","vir","wash","wis","wyo",
]);

/** Hele-ord-match (Unicode-bevidst, så ø/å/æ brydes korrekt). */
function containsCity(lowerHometown: string, lowerCity: string): boolean {
  const escaped = lowerCity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, "u").test(lowerHometown);
}

const DANISH_CITIES_LOWER = DANISH_CITIES.map((c) => c.toLowerCase());

/**
 * Tjekker om en hometown-streng indikerer en dansk atlet.
 * To signaler: (1) eksplicit land-marker "Denmark"/"Danmark", ELLER (2) en dansk by
 * som helt ord. Begge filtreres for kendte US-false-positives (Denmark, SC; Denmark HS;
 * Viborg, SD; Copenhagen, NY osv.) via FP-mønstre + US-stat-suffiks efter komma.
 */
export function isDanishHometown(hometown: string | null): boolean {
  if (!hometown) return false;
  const lower = hometown.toLowerCase().trim();

  // Filtrér kendte false positives (Denmark, SC; Denmark HS osv.)
  if (FALSE_POSITIVE_PATTERNS.some((pattern) => pattern.test(lower))) return false;

  // US-adresse? hometown med US-stat-forkortelse efter komma (fx "Viborg, SD",
  // "Copenhagen, NY", "Denmark, Wis.") → afvis uanset by-/landmatch.
  const parts = lower.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].replace(/[^a-z]/g, "");
    if (US_STATE_IDENTIFIERS.has(lastPart)) return false;
  }

  // Signal 1: eksplicit dansk land-marker
  const hasDanishMarker = DANISH_COUNTRY_MARKERS.some(
    (marker) => lower.includes(marker.toLowerCase()),
  );
  if (hasDanishMarker) return true;

  // Signal 2: en dansk by optræder som helt ord (efter US-filtrene ovenfor)
  return DANISH_CITIES_LOWER.some((city) => containsCity(lower, city));
}
