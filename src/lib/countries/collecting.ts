/**
 * COLLECTING countries: no domain, no site, no articles — but their athletes,
 * stories and award history are gathered, so the history is in place at launch.
 *
 * Mikkel, 2026-09-30: "Go with Australia, Germany, Sweden, Spain." France added 2026-10-08; eight more
 * 2026-10-22 (see below). Chosen from
 * the international catalogue (athletes: Spain 1,575, Germany 1,350,
 * Australia 1,047, Sweden 864).
 *
 * What collecting means, and where it is enforced:
 *   - roster scraping classifies these hometowns (classifierCountries()), so
 *     athletes get home_country = 'AU' / 'DE' / 'SE' / 'ES';
 *   - discovery (name matching, no LLM) attaches their stories;
 *   - the honours scraper builds their timelines (shared browser budget);
 *   - NOTHING that writes for readers or spends the LLM chain touches them:
 *     fact sheets, article generation, profile drafts, Instagram and photo
 *     queues filter on siteCountryCodes() (see siteCountrySql()).
 *   - They are not in COUNTRIES, so no host, sitemap, stats or social exists.
 *
 * Launching one = a full CountryProfile in its own file + a line in COUNTRIES,
 * and removing it here (PLAYBOOK-nyt-land.md).
 *
 * City lists are deliberately SHORT and unambiguous. A city that also exists
 * in the US or elsewhere (Hanover, Bremen, Valencia, Granada, Córdoba, Toledo,
 * Melbourne FL, Perth "WA" = Washington to the US-state guard) is left out: such
 * athletes are caught by the country marker the roster usually writes.
 */
import type { HometownProfile } from "./types";

export const au: HometownProfile = {
  code: "AU",
  countryMarkers: ["Australia", "AUS", "New South Wales", "NSW", "Queensland", "QLD", "Tasmania", "Western Australia", "South Australia", "Northern Territory"],
  cities: ["Sydney", "Brisbane", "Adelaide", "Canberra", "Gold Coast", "Sunshine Coast", "Wollongong", "Geelong", "Townsville", "Toowoomba", "Hobart", "Newcastle, NSW"],
  falsePositivePatterns: [/new\s+south\s+wales\s*,?\s*(usa|u\.s\.)/i],
};

export const de: HometownProfile = {
  code: "DE",
  countryMarkers: ["Germany", "Deutschland", "GER"],
  cities: ["Berlin", "München", "Munich", "Hamburg", "Köln", "Cologne", "Frankfurt am Main", "Stuttgart", "Düsseldorf", "Dusseldorf", "Leipzig", "Dresden", "Nürnberg", "Nuremberg", "Essen", "Dortmund", "Bonn", "Mannheim", "Karlsruhe", "Freiburg", "Mainz", "Wiesbaden", "Augsburg", "Münster", "Kiel", "Rostock", "Potsdam"],
  falsePositivePatterns: [/\bgermantown\b/i, /\bnew\s+berlin\b/i],
};

export const se: HometownProfile = {
  code: "SE",
  countryMarkers: ["Sweden", "Sverige", "SWE"],
  cities: ["Stockholm", "Göteborg", "Gothenburg", "Malmö", "Malmo", "Uppsala", "Linköping", "Linkoping", "Västerås", "Vasteras", "Örebro", "Orebro", "Helsingborg", "Jönköping", "Jonkoping", "Norrköping", "Norrkoping", "Umeå", "Umea", "Lund"],
  falsePositivePatterns: [],
};

export const es: HometownProfile = {
  code: "ES",
  countryMarkers: ["Spain", "España", "Espana", "ESP"],
  cities: ["Madrid", "Barcelona", "Sevilla", "Seville", "Bilbao", "Zaragoza", "Málaga", "Malaga", "Palma de Mallorca", "Alicante", "San Sebastián", "San Sebastian", "Pamplona", "Valladolid", "Vigo", "Gijón", "Gijon", "Oviedo", "Murcia", "Las Palmas", "Tenerife", "Marbella"],
  falsePositivePatterns: [],
};

/**
 * Added 2026-10-08 (Mikkel: "Yes" to collecting France — 1,109 athletes in the
 * catalogue, fourth after the UK, Spain and Germany). Paris, Lyon, Marseille,
 * Nice, Versailles and Orleans are left out: Paris TX/TN/KY, Lyon County,
 * Marseilles IL, Nice CA, Versailles KY, Orleans MA. "Paris, France" is caught
 * by the marker.
 */
export const fr: HometownProfile = {
  code: "FR",
  countryMarkers: ["France", "FRA"],
  cities: ["Toulouse", "Bordeaux", "Nantes", "Strasbourg", "Rennes", "Lille", "Grenoble", "Reims", "Dijon", "Clermont-Ferrand", "Aix-en-Provence", "Boulogne-Billancourt", "Saint-Étienne", "Saint-Etienne", "Le Havre", "Le Mans"],
  falsePositivePatterns: [],
};

/*
 * Added 2026-10-22 (Mikkel: «Add Norway, Netherlands, Italy, NZ, Ireland,
 * Brazil, Mexico and Argentina»). Active athletes in the catalogue: Brazil
 * 814, Italy 736, Mexico 567, New Zealand 399, Norway 394, Netherlands 370,
 * Argentina 329, Ireland 228.
 *
 * Left out of the city lists because a US (or British) place has the name:
 * Bergen (NJ county), Moss; Amsterdam NY, Rotterdam NY, Holland MI, Zwolle LA,
 * Breda IA; Rome, Milan, Naples, Florence, Venice, Verona, Genoa, Parma,
 * Turin, Como; Wellington, Christchurch, Hamilton, Dunedin FL, Nelson,
 * Hastings, Blenheim; Dublin, Waterford; Vitória, Santos, Joinville; Mérida,
 * León; Córdoba, Rosario, La Plata, Santa Fe, San Juan, Paraná. Those
 * athletes are caught by the country marker. «MEX» and «Mex.» are a US-state
 * abbreviation to the guard in hometown.ts (N. Mex.), so a roster that writes
 * only that is missed, never misfiled. Northern Ireland is the UK's: the UK
 * profile runs first, and «Northern Ireland» is a false positive here.
 */
export const no: HometownProfile = {
  code: "NO",
  countryMarkers: ["Norway", "Norge", "NOR"],
  cities: ["Oslo", "Trondheim", "Stavanger", "Drammen", "Kristiansand", "Tromsø", "Tromso", "Fredrikstad", "Sandnes", "Bodø", "Bodo", "Ålesund", "Alesund", "Sandefjord", "Tønsberg", "Tonsberg", "Lillestrøm", "Lillestrom", "Bærum", "Baerum", "Asker", "Hamar", "Molde", "Haugesund", "Skien", "Larvik", "Kongsberg", "Lillehammer", "Gjøvik", "Gjovik", "Halden"],
  falsePositivePatterns: [],
};

export const nl: HometownProfile = {
  code: "NL",
  countryMarkers: ["Netherlands", "The Netherlands", "Nederland", "NED"],
  cities: ["Utrecht", "Eindhoven", "Groningen", "Tilburg", "Nijmegen", "Haarlem", "Arnhem", "Leiden", "Delft", "Maastricht", "Enschede", "Den Haag", "The Hague", "Amersfoort", "Apeldoorn", "Almere", "Hilversum", "Alkmaar", "Dordrecht", "'s-Hertogenbosch", "Den Bosch"],
  falsePositivePatterns: [],
};

export const it: HometownProfile = {
  code: "IT",
  countryMarkers: ["Italy", "Italia", "ITA"],
  cities: ["Roma", "Milano", "Napoli", "Torino", "Firenze", "Bologna", "Genova", "Venezia", "Bari", "Catania", "Trieste", "Padova", "Padua", "Bergamo", "Brescia", "Cagliari", "Perugia", "Udine", "Trento", "Bolzano", "Ancona", "Pescara", "Reggio Emilia", "Rimini", "Lecce", "Monza", "Treviso", "Vicenza", "Siena", "Pisa", "Livorno", "Ravenna", "Ferrara"],
  falsePositivePatterns: [],
};

export const nz: HometownProfile = {
  code: "NZ",
  countryMarkers: ["New Zealand", "NZ", "N.Z.", "NZL", "Aotearoa"],
  cities: ["Auckland", "Tauranga", "Palmerston North", "Napier", "Rotorua", "Whangarei", "New Plymouth", "Queenstown", "Invercargill", "Whanganui", "Gisborne", "Timaru", "Taupo", "Lower Hutt", "Upper Hutt", "Porirua"],
  falsePositivePatterns: [],
};

export const ie: HometownProfile = {
  code: "IE",
  countryMarkers: ["Ireland", "Republic of Ireland", "Éire", "IRL"],
  cities: ["Cork", "Limerick", "Galway", "Kilkenny", "Athlone", "Drogheda", "Dundalk", "Sligo", "Wexford", "Killarney", "Tralee", "Ennis", "Navan", "Naas", "Letterkenny", "Carlow", "Mullingar"],
  falsePositivePatterns: [/\bnorthern\s+ireland\b/i, /\bn\.?\s*ireland\b/i],
};

export const br: HometownProfile = {
  code: "BR",
  countryMarkers: ["Brazil", "Brasil", "BRA"],
  cities: ["São Paulo", "Sao Paulo", "Rio de Janeiro", "Belo Horizonte", "Brasília", "Brasilia", "Curitiba", "Porto Alegre", "Florianópolis", "Florianopolis", "Recife", "Fortaleza", "Campinas", "Goiânia", "Goiania", "Manaus", "Belém", "Belem", "Niterói", "Niteroi", "Ribeirão Preto", "Ribeirao Preto", "Londrina", "Maringá", "Maringa"],
  falsePositivePatterns: [],
};

export const mx: HometownProfile = {
  code: "MX",
  countryMarkers: ["Mexico", "México"],
  cities: ["Mexico City", "Ciudad de México", "Guadalajara", "Monterrey", "Tijuana", "Puebla", "Cancún", "Cancun", "Querétaro", "Queretaro", "Hermosillo", "Chihuahua", "Culiacán", "Culiacan", "Toluca", "Aguascalientes", "Saltillo", "Morelia", "San Luis Potosí", "Mexicali", "Ciudad Juárez", "Mazatlán", "Mazatlan", "Oaxaca", "Veracruz", "Cuernavaca", "Torreón", "Torreon", "Zapopan"],
  falsePositivePatterns: [/\bnew\s+mexico\b/i, /\bgulf\s+of\s+mexico\b/i],
};

export const ar: HometownProfile = {
  code: "AR",
  countryMarkers: ["Argentina", "ARG"],
  cities: ["Buenos Aires", "Mendoza", "Mar del Plata", "Tucumán", "Tucuman", "Salta", "Neuquén", "Neuquen", "Bahía Blanca", "Bahia Blanca", "Corrientes", "Posadas", "Resistencia", "Rafaela"],
  falsePositivePatterns: [],
};

/** Order matters only against each other; sites are classified first. */
export const COLLECTING: Record<string, HometownProfile> = {
  AU: au, DE: de, SE: se, ES: es, FR: fr,
  NO: no, NL: nl, IT: it, NZ: nz, IE: ie, BR: br, MX: mx, AR: ar,
};
