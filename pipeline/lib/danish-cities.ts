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

/**
 * Tjekker om en hometown-streng indikerer en dansk atlet.
 * Kræver at hometown indeholder "Danmark" eller "Denmark",
 * men filtrerer kendte US-false-positives (Denmark, SC; Denmark HS osv.).
 */
export function isDanishHometown(hometown: string | null): boolean {
  if (!hometown) return false;
  const lower = hometown.toLowerCase().trim();

  // Tjek om det indeholder et dansk land-marker
  const hasDanishMarker = DANISH_COUNTRY_MARKERS.some(
    (marker) => lower.includes(marker.toLowerCase()),
  );
  if (!hasDanishMarker) return false;

  // Filtrér kendte false positives
  if (FALSE_POSITIVE_PATTERNS.some((pattern) => pattern.test(lower))) return false;

  // Ekstra sikkerhed: hvis hometown indeholder en US-stat-forkortelse efter komma,
  // er det sandsynligvis en US-adresse (f.eks. "Denmark, SC" eller "Denmark, Wis.")
  const parts = lower.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].replace(/[^a-z]/g, "");
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
    if (US_STATE_IDENTIFIERS.has(lastPart)) return false;
  }

  return true;
}
