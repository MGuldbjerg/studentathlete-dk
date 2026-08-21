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
  /**
   * Landets navn på ENGELSK, til schema.org (`nationality`). Her stod
   * «Denmark» hårdkodet i JSON-LD, så britiske atleter blev udgivet som
   * danskere til Google.
   */
  nationalityName: string;
  /**
   * Tillægsordet på SITETS eget sprog ("danske" / "British"). Landenavnet duer
   * til schema.org, men ikke til en sætning: «student athletes from United
   * Kingdom» mangler en artikel, og «fra Denmark» er ikke dansk.
   */
  demonym: string;
  contactEmail: string;
  /** Byer der udpeger en atlet som hjemmehørende (hele ord, med lokale tegn). */
  cities: string[];
  /**
   * Skolens stavemåde → byens rigtige navn på landets eget sprog.
   *
   * Amerikanske rosters skriver enten det engelske eksonym ("Copenhagen") eller
   * en ASCII-foldning af de lokale tegn ("Vaerloese", "Helsingor"). Rå
   * roster-tekst er sand som DATA — den bliver stående i `athletes.hometown` —
   * men den må ikke stå i en dansk sætning på sitet. Nøglen matches uden
   * hensyn til store/små bogstaver.
   *
   * Tabellen er bevidst EKSPLICIT frem for regelbaseret: en generisk
   * "oe→ø, aa→å"-regel ville skrive Aalborg om til Ålborg og Aarhus til Århus,
   * som begge er de FORKERTE former (byerne hedder officielt Aalborg og
   * Aarhus). Dukker en ny foldet stavemåde op i data, tilføjes den her.
   */
  cityAliases?: Record<string, string>;
  /** Eksplicitte landenavne i roster-data, fx "Denmark"/"Danmark". */
  countryMarkers: string[];
  /** Kendte US-steder der ligner landet og skal afvises. */
  falsePositivePatterns: RegExp[];
  /**
   * Dark launch: domænet peger på sitet, men søgemaskiner holdes ude.
   *
   * Et nyt land er live længe før det har sit eget indhold. Bliver det crawlet
   * i mellemtiden, lærer Google det at kende som tyndt — eller som en dublet af
   * standardsitet, hvis motoren endnu ikke filtrerer indholdet på land.
   * Slå fra når sitet har sit eget indhold; det er ét ord og et deploy.
   */
  darkLaunch?: boolean;
}
