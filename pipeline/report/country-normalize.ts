/**
 * Land-normalisering og US-stat-detektion for international atlet-analyse.
 */

/** US-stater: forkortelser og fulde navne */
const US_STATES = new Set([
  // Forkortelser
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
  // Fulde navne (lowercase)
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut",
  "delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa",
  "kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan",
  "minnesota","mississippi","missouri","montana","nebraska","nevada",
  "new hampshire","new jersey","new mexico","new york","north carolina",
  "north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island",
  "south carolina","south dakota","tennessee","texas","utah","vermont",
  "virginia","washington","west virginia","wisconsin","wyoming",
  "district of columbia",
]);

/** Canadiske provinser */
const CANADIAN_PROVINCES = new Set([
  "AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT",
  "alberta","british columbia","manitoba","new brunswick","newfoundland",
  "nova scotia","northwest territories","nunavut","ontario",
  "prince edward island","quebec","saskatchewan","yukon",
]);

/** Normalisering: lokale navne → standardiseret engelsk navn */
const COUNTRY_ALIASES: Record<string, string> = {
  // Skandinavien
  "denmark": "Denmark", "danmark": "Denmark", "dnk": "Denmark", "dk": "Denmark",
  "sweden": "Sweden", "sverige": "Sweden", "swe": "Sweden", "se": "Sweden",
  "norway": "Norway", "norge": "Norway", "nor": "Norway", "no": "Norway",
  "finland": "Finland", "suomi": "Finland", "fin": "Finland",
  "iceland": "Iceland", "island": "Iceland", "isl": "Iceland",

  // Europa
  "germany": "Germany", "deutschland": "Germany", "ger": "Germany", "de": "Germany",
  "france": "France", "frankrig": "France", "fra": "France",
  "spain": "Spain", "spanien": "Spain", "españa": "Spain", "esp": "Spain",
  "italy": "Italy", "italien": "Italy", "italia": "Italy", "ita": "Italy",
  "netherlands": "Netherlands", "holland": "Netherlands", "the netherlands": "Netherlands", "ned": "Netherlands",
  "belgium": "Belgium", "belgien": "Belgium", "belgie": "Belgium", "bel": "Belgium",
  "switzerland": "Switzerland", "schweiz": "Switzerland", "suisse": "Switzerland", "svizzera": "Switzerland", "sui": "Switzerland",
  "austria": "Austria", "østrig": "Austria", "österreich": "Austria", "aut": "Austria",
  "portugal": "Portugal", "por": "Portugal",
  "ireland": "Ireland", "irland": "Ireland", "irl": "Ireland",
  "scotland": "UK", "england": "UK", "wales": "UK",
  "united kingdom": "UK", "great britain": "UK", "uk": "UK", "gbr": "UK", "gb": "UK",
  "czech republic": "Czech Republic", "czechia": "Czech Republic", "cze": "Czech Republic",
  "poland": "Poland", "polen": "Poland", "pol": "Poland",
  "hungary": "Hungary", "ungarn": "Hungary", "hun": "Hungary",
  "croatia": "Croatia", "kroatien": "Croatia", "cro": "Croatia",
  "serbia": "Serbia", "serbien": "Serbia", "srb": "Serbia",
  "slovenia": "Slovenia", "slovenien": "Slovenia", "slo": "Slovenia",
  "slovakia": "Slovakia", "slovakiet": "Slovakia", "svk": "Slovakia",
  "romania": "Romania", "rumænien": "Romania", "rou": "Romania",
  "bulgaria": "Bulgaria", "bulgarien": "Bulgaria", "bul": "Bulgaria",
  "greece": "Greece", "grækenland": "Greece", "gre": "Greece",
  "turkey": "Turkey", "tyrkiet": "Turkey", "türkiye": "Turkey", "tur": "Turkey",
  "russia": "Russia", "rusland": "Russia", "rus": "Russia",
  "ukraine": "Ukraine", "ukr": "Ukraine",
  "latvia": "Latvia", "letland": "Latvia", "lat": "Latvia",
  "lithuania": "Lithuania", "litauen": "Lithuania", "ltu": "Lithuania",
  "estonia": "Estonia", "estland": "Estonia", "est": "Estonia",
  "cyprus": "Cyprus", "cypern": "Cyprus", "cyp": "Cyprus",
  "luxembourg": "Luxembourg", "lux": "Luxembourg",
  "malta": "Malta", "mlt": "Malta",
  "bosnia and herzegovina": "Bosnia", "bosnia": "Bosnia", "bih": "Bosnia",
  "north macedonia": "North Macedonia", "macedonia": "North Macedonia", "mkd": "North Macedonia",
  "montenegro": "Montenegro", "mne": "Montenegro",
  "albania": "Albania", "alb": "Albania",
  "kosovo": "Kosovo",
  "belarus": "Belarus", "blr": "Belarus",
  "moldova": "Moldova", "mda": "Moldova",

  // Nordamerika
  "canada": "Canada", "can": "Canada",
  "mexico": "Mexico", "mex": "Mexico",
  "puerto rico": "Puerto Rico",

  // Sydamerika
  "brazil": "Brazil", "brasil": "Brazil", "bra": "Brazil",
  "argentina": "Argentina", "arg": "Argentina",
  "colombia": "Colombia", "col": "Colombia",
  "chile": "Chile", "chi": "Chile",
  "venezuela": "Venezuela", "ven": "Venezuela",
  "ecuador": "Ecuador", "ecu": "Ecuador",
  "peru": "Peru", "per": "Peru",
  "uruguay": "Uruguay", "uru": "Uruguay",
  "paraguay": "Paraguay", "par": "Paraguay",
  "bolivia": "Bolivia", "bol": "Bolivia",

  // Oceanien
  "australia": "Australia", "aus": "Australia",
  "new zealand": "New Zealand", "nzl": "New Zealand",

  // Asien
  "japan": "Japan", "jpn": "Japan",
  "south korea": "South Korea", "korea": "South Korea", "kor": "South Korea",
  "china": "China", "chn": "China",
  "india": "India", "ind": "India",
  "taiwan": "Taiwan", "tpe": "Taiwan",
  "thailand": "Thailand", "tha": "Thailand",
  "philippines": "Philippines", "phi": "Philippines",
  "singapore": "Singapore", "sgp": "Singapore",
  "malaysia": "Malaysia", "mas": "Malaysia",
  "indonesia": "Indonesia", "ina": "Indonesia",

  // Afrika
  "south africa": "South Africa", "rsa": "South Africa",
  "nigeria": "Nigeria", "ngr": "Nigeria",
  "kenya": "Kenya", "ken": "Kenya",
  "ghana": "Ghana", "gha": "Ghana",
  "cameroon": "Cameroon", "cmr": "Cameroon",
  "egypt": "Egypt", "ægypten": "Egypt", "egy": "Egypt",
  "morocco": "Morocco", "marokko": "Morocco", "mar": "Morocco",
  "senegal": "Senegal", "sen": "Senegal",
  "ethiopia": "Ethiopia", "eth": "Ethiopia",
  "tanzania": "Tanzania", "tan": "Tanzania",
  "zimbabwe": "Zimbabwe", "zim": "Zimbabwe",

  // Caribien
  "jamaica": "Jamaica", "jam": "Jamaica",
  "trinidad and tobago": "Trinidad and Tobago", "tto": "Trinidad and Tobago",
  "bahamas": "Bahamas", "bah": "Bahamas",
  "barbados": "Barbados", "bar": "Barbados",
  "bermuda": "Bermuda", "ber": "Bermuda",
  "haiti": "Haiti", "hai": "Haiti",
  "dominican republic": "Dominican Republic", "dom": "Dominican Republic",
  "cuba": "Cuba", "cub": "Cuba",

  // Mellemøsten
  "israel": "Israel", "isr": "Israel",
  "iran": "Iran", "iri": "Iran",
  "iraq": "Iraq", "irq": "Iraq",
  "saudi arabia": "Saudi Arabia", "ksa": "Saudi Arabia",
  "united arab emirates": "UAE", "uae": "UAE",
  "qatar": "Qatar", "qat": "Qatar",
  "jordan": "Jordan", "jor": "Jordan",
  "lebanon": "Lebanon", "lib": "Lebanon",
};

export interface CountryResult {
  country: string;      // Standardiseret landnavn
  isDomestic: boolean;   // true = USA
  isCanadian: boolean;   // true = Canada
}

/**
 * Klassificér en hometown-streng til land.
 * Forventer format som "Viborg, Denmark" eller "Denver, CO".
 */
export function classifyHometown(hometown: string | null): CountryResult {
  if (!hometown || hometown.trim().length === 0) {
    return { country: "Unknown", isDomestic: false, isCanadian: false };
  }

  // Tag den sidste komma-separerede del
  const parts = hometown.split(",").map((p) => p.trim());
  const lastPart = parts[parts.length - 1];
  const lastPartLower = lastPart.toLowerCase();
  const lastPartUpper = lastPart.toUpperCase();

  // Tjek US-stat (forkortelse eller fuldt navn)
  if (US_STATES.has(lastPartUpper) || US_STATES.has(lastPartLower)) {
    return { country: "USA", isDomestic: true, isCanadian: false };
  }

  // Tjek canadisk provins
  if (CANADIAN_PROVINCES.has(lastPartUpper) || CANADIAN_PROVINCES.has(lastPartLower)) {
    return { country: "Canada", isDomestic: false, isCanadian: true };
  }

  // Tjek land-aliases
  const normalized = COUNTRY_ALIASES[lastPartLower];
  if (normalized) {
    return {
      country: normalized,
      isDomestic: false,
      isCanadian: normalized === "Canada",
    };
  }

  // Hvis der kun er ét element (ingen komma), tjek om hele strengen er et land
  if (parts.length === 1) {
    const wholeLower = hometown.toLowerCase().trim();
    const wholeNormalized = COUNTRY_ALIASES[wholeLower];
    if (wholeNormalized) {
      return {
        country: wholeNormalized,
        isDomestic: false,
        isCanadian: wholeNormalized === "Canada",
      };
    }
  }

  // Ukendt — sandsynligvis USA med uventet format, men marker som Unknown
  return { country: "Unknown", isDomestic: false, isCanadian: false };
}
