/**
 * Danske byer og lande-markører til identifikation af danske atleter på rosters.
 * Listen dækker de 100 største byer plus varianter (engelsk/dansk stavning).
 */

export const DANISH_COUNTRY_MARKERS = [
  "Denmark",
  "DEN",
  "Danmark",
  "DNK",
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
 * Tjekker om en hometown-streng indikerer en dansk atlet.
 * Matcher på lande-markører og danske bynavn.
 */
export function isDanishHometown(hometown: string | null): boolean {
  if (!hometown) return false;
  const lower = hometown.toLowerCase();

  for (const marker of DANISH_COUNTRY_MARKERS) {
    if (lower.includes(marker.toLowerCase())) return true;
  }

  for (const city of DANISH_CITIES) {
    if (lower.includes(city.toLowerCase())) return true;
  }

  return false;
}
