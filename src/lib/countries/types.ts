/**
 * Kontrakten for et land. Alt der adskiller ét nationalt site fra et andet skal
 * kunne udtrykkes her — kan noget ikke det, hører det til i motoren.
 */
export interface CountryProfile {
  /** ISO 3166-1 alpha-2, fx "DK". Samme værdi som athletes.home_country. */
  code: string;
  /** Hvilken sprogpakke sitet bruger (src/lib/i18n/). Flere lande kan dele én. */
  language: string;
  /** Kanonisk vært. Bestemmer også 301-redirects og absolutte URL'er. */
  host: string;
  /** Sitets navn i UI, feeds og user-agents. */
  brand: string;
  contactEmail: string;
  /** Byer der udpeger en atlet som hjemmehørende (hele ord, med lokale tegn). */
  cities: string[];
  /** Eksplicitte landenavne i roster-data, fx "Denmark"/"Danmark". */
  countryMarkers: string[];
  /** Kendte US-steder der ligner landet og skal afvises. */
  falsePositivePatterns: RegExp[];
}
