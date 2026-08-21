/**
 * LANDEPROFIL: Danmark.
 * =====================
 *
 * Alt landeafhængigt for studentathlete.dk. Et nyt land kopierer DENNE fil,
 * skifter byliste, markører og domæne — motoren røres ikke.
 *
 * `cities` + `countryMarkers` er de to signaler `matchesCountry()` bruger til at
 * afgøre om en roster-atlet hører til landet. `falsePositivePatterns` er de
 * amerikanske steder der ligner (Denmark, SC · Denmark High School) og som
 * ellers ville smugle US-atleter ind.
 */
import type { CountryProfile } from "./types";

const cities: string[] = [
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
  // "Elsinore" (engelsk navn for Helsingør) fjernet — det matcher Lake Elsinore, CA
  // og Elsinore, UT som falske positiver. "Helsingør" er det reelle danske signal.
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
 * Roster-stavemåde → dansk bynavn. Se `cityAliases` i countries/types.ts for
 * hvorfor tabellen er håndholdt. Alle nøgler her er observeret i live-data.
 *
 * Aalborg, Aarhus og Aabenraa står med VILJE ikke her: de hedder officielt
 * netop sådan, og de står allerede i `cities` ovenfor.
 */
const cityAliases: Record<string, string> = {
  // Engelske eksonymer
  copenhagen: "København",
  // "Elsinore" er fjernet fra `cities` (det matcher Lake Elsinore, CA som falsk
  // positiv). Her er det ufarligt: opslaget sker først EFTER en atlet er
  // klassificeret som dansk, så navnet kan ikke smugle nogen ind.
  elsinore: "Helsingør",

  // ASCII-foldninger fra amerikanske rosters
  bagsvaerd: "Bagsværd",
  brondby: "Brøndby",
  broendby: "Brøndby",
  espergaerde: "Espergærde",
  helsingor: "Helsingør",
  helsingoer: "Helsingør",
  hjoerring: "Hjørring",
  hoersholm: "Hørsholm",
  holbaek: "Holbæk",
  koege: "Køge",
  naestved: "Næstved",
  roedovre: "Rødovre",
  skorping: "Skørping",
  soenderborg: "Sønderborg",
  stenlose: "Stenløse",
  stenloese: "Stenløse",
  stjaer: "Stjær",
  vaerloese: "Værløse",
  vedbaek: "Vedbæk",

  // Rene stavefejl hos skolen (rettes kun når byen er entydig)
  fredriksberg: "Frederiksberg",
  rosekilde: "Roskilde",
  taarmby: "Tårnby",
};

export const dk: CountryProfile = {
  code: "DK",
  language: "da",
  host: "studentathlete.dk",
  brand: "StudentAthlete.dk",
  nationalityName: "Denmark",
  contactEmail: "info@studentathlete.dk",
  cities,
  cityAliases,
  countryMarkers: ["Denmark", "Danmark"],
  falsePositivePatterns: [
    /denmark,?\s*(sc|wi|me|ms|tn|ga|al)\b/i,
    /denmark\s+(hs|high|h\.s\.|academy|school|prep)/i,
    /\b(ga|sc|wi|me)\b.*denmark/i,
  ],
};
