/**
 * COLLECTING countries: no domain, no site, no articles — but their athletes,
 * stories and award history are gathered, so the history is in place at launch.
 *
 * Mikkel, 2026-09-30: "Go with Australia, Germany, Sweden, Spain." Chosen from
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

/** Order matters only against each other; sites are classified first. */
export const COLLECTING: Record<string, HometownProfile> = { AU: au, DE: de, SE: se, ES: es };
