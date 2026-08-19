/**
 * KERNE: sportsgrenenes sprogfri identitet.
 * =========================================
 *
 * Nøglen for en sportsgren er den NCAA-slug skolerne selv bruger
 * ("soccer", "swimming-and-diving"). Den er IKKE et dansk ord.
 *
 * Det var den før: `athletes.sport` indeholdt "fodbold", altså et dansk
 * navneord som primærnøgle. Alt nedenstrøms sammenlignede så mod danske
 * strenge — og et tysk site ville enten skulle skrive "fodbold" i sin egen
 * database eller have sin egen kopi af logikken. Nu er nøglen den samme
 * overalt, og sproget lever i sprogpakken (`src/lib/i18n/`).
 *
 * Bemærk at `roster_checks` og `international_athletes` ALLEREDE brugte disse
 * slugs — det er kun `athletes` der stak af. Migration 035 retter det.
 *
 * Farver og ikoner hører til her: en farve er ikke dansk.
 */

export const SPORT_KEYS = [
  "football",
  "basketball",
  "baseball",
  "soccer",
  "track-and-field",
  "swimming-and-diving",
  "golf",
  "tennis",
  "rowing",
  "gymnastics",
  "ice-hockey",
  "volleyball",
  "field-hockey",
  "rugby",
  "water-polo",
  "fencing",
  "squash",
  "esports",
  "other",
] as const;

export type SportKey = (typeof SPORT_KEYS)[number];

const SPORT_KEY_SET = new Set<string>(SPORT_KEYS);

export function isSportKey(v: string | null | undefined): v is SportKey {
  return !!v && SPORT_KEY_SET.has(v);
}

/**
 * Sportsgren fra scraperen (NCAA-slug) → kanonisk nøgle. Identitet i dag, men
 * beholdt som funktion fordi kilder kan finde på at skrive "mens-soccer" eller
 * "wswim" — så er der ét sted at oversætte det.
 */
const SOURCE_ALIASES: Record<string, SportKey> = {
  soccer: "soccer",
  "mens-soccer": "soccer",
  "womens-soccer": "soccer",
  "track-and-field": "track-and-field",
  "cross-country": "track-and-field",
  "swimming-and-diving": "swimming-and-diving",
  swimming: "swimming-and-diving",
  "ice-hockey": "ice-hockey",
  hockey: "ice-hockey",
  gymnastics: "gymnastics",
  rowing: "rowing",

  // Tilføjet med sport-inventaret (2026-08-17): skolernes egne holdnavne er
  // mere varierede end de tolv slugs pipelinen gættede på. Alt herunder er
  // navne vi HAR set i skolernes sitemaps.
  "cross-country-and-track-and-field": "track-and-field",
  "track-and-field-and-cross-country": "track-and-field",
  "indoor-track-and-field": "track-and-field",
  "outdoor-track-and-field": "track-and-field",
  "indoor-track": "track-and-field",
  "outdoor-track": "track-and-field",
  "track-field": "track-and-field",
  track: "track-and-field",
  xc: "track-and-field",
  "swimming-diving": "swimming-and-diving",
  diving: "swimming-and-diving",
  "swim-and-dive": "swimming-and-diving",
  "swim-dive": "swimming-and-diving",
  // Beach volleyball er en selvstændig NCAA-sport, men en dansk beachspiller er
  // bedre beskrevet som "volleyball" end som "andet".
  "beach-volleyball": "volleyball",
  "sand-volleyball": "volleyball",
  crew: "rowing",
  "lightweight-rowing": "rowing",
  "ice-hockey-men": "ice-hockey",
  "basketball-men": "basketball",
  // Landhockey blev en kanonisk nøgle 2026-08-18 (Mikkel): NCAA-landhockey er
  // en KVINDESPORT — der findes intet herremesterskab og ingen herrelegater — og
  // den er en af de stærkeste britiske veje ind i NCAA. Den lå indtil da i
  // "other", hvor sporten forsvandt sammen med lacrosse og water polo.
  fieldhockey: "field-hockey",
  "field-hockey-women": "field-hockey",
  fhockey: "field-hockey",

  // ── Fem nye kanoniske nøgler 2026-08-19 (Mikkel fandt atleterne i "andet") ──
  // Rugby: NCAA-emerging sport for KVINDER (NIRA), klubsport for mænd.
  rugby: "rugby",
  "mens-rugby": "rugby",
  "womens-rugby": "rugby",
  "club-mens-rugby": "rugby",
  "club-womens-rugby": "rugby",
  "mens-rugby-club": "rugby",
  "womens-rugby-club": "rugby",
  // Vandpolo. NB: "mens-polo"/"womens-polo" er hestepolo og bliver BEVIDST i
  // "other" — polo uden vand er en anden sport.
  "water-polo": "water-polo",
  "mens-water-polo": "water-polo",
  "womens-water-polo": "water-polo",
  "club-mens-water-polo": "water-polo",
  "club-womens-water-polo": "water-polo",
  // Fægtning — NCAA-mesterskab på tværs af divisioner.
  fencing: "fencing",
  "mens-fencing": "fencing",
  "womens-fencing": "fencing",
  "fencing-practice-players": "fencing",
  // Squash — IKKE NCAA (College Squash Association), men varsity-sport.
  squash: "squash",
  "mens-squash": "squash",
  "womens-squash": "squash",
  msquash: "squash",
  wsquash: "squash",
  // Esport. Skolerne skriver spillets navn, ikke "esport" — spiltitlerne ER
  // holdnavnet i sitemappet, så de skal stå her.
  esports: "esports",
  esport: "esports",
  "club-esports": "esports",
  "league-of-legends": "esports",
  valorant: "esports",
  overwatch: "esports",
  "overwatch-2": "esports",
  "overwatch-2-red": "esports",
  "rocket-league": "esports",
  "counter-strike": "esports",
  "super-smash-bros": "esports",
  "super-smash-bros-ultimate": "esports",
  "rainbow-six-siege": "esports",
  "marvel-rivals": "esports",

  // ── Huller i eksisterende nøgler (samme runde) ────────────────────────────
  // Roning: skolerne deler efter vægtklasse og skriver "crew" lige så tit som
  // "rowing" — 30 danske/britiske roere lå i "andet" på de her etiketter.
  "mens-rowing": "rowing",
  "womens-rowing": "rowing",
  "heavyweight-rowing": "rowing",
  "mens-heavyweight-rowing": "rowing",
  "womens-heavyweight-rowing": "rowing",
  "mens-lightweight-rowing": "rowing",
  "womens-lightweight-rowing": "rowing",
  "mens-crew": "rowing",
  "womens-crew": "rowing",
  mcrew: "rowing",
  wcrew: "rowing",
  mcrewhvy: "rowing",
  mcrewlt: "rowing",
  wcrewlt: "rowing",
  wcrewop: "rowing",
  mrow: "rowing",
  wrow: "rowing",
  // Cross country hører til atletik (som "cross-country" allerede gjorde) —
  // rosterne er i praksis de samme løbere, og skolerne slår tit bane og
  // terræn sammen i ét holdnavn.
  "cross-country-men": "track-and-field",
  "cross-country-women": "track-and-field",
  "mens-cross-country": "track-and-field",
  "womens-cross-country": "track-and-field",
  "mens-cross-country-pre-2017": "track-and-field",
  "womens-cross-country-pre-2017": "track-and-field",
  "combined-cross-country": "track-and-field",
  "cross-country-track": "track-and-field",
  "track-cross-country": "track-and-field",
  "track-field-cross-country": "track-and-field",
  "track-fieldcross-country": "track-and-field",
  "womens-cross-country-track": "track-and-field",
  "mens-track-and-field-xc": "track-and-field",
  "womens-track-and-field-xc": "track-and-field",
  "mw-track-and-field": "track-and-field",
  "mens-indoor-track-field": "track-and-field",
  "womens-indoor-track-field": "track-and-field",
  "mens-outdoor-track-field": "track-and-field",
  "womens-outdoor-track-field": "track-and-field",
  athletics: "track-and-field",
  cross: "track-and-field",
  mcross: "track-and-field",
  wcross: "track-and-field",
  mxct: "track-and-field",
  tfxc: "track-and-field",
  xctrack: "track-and-field",
  mtrack: "track-and-field",
  wtrack: "track-and-field",
  // Skolernes forkortelser og JV/reserve-hold. En JV-fodboldspiller spiller
  // fodbold — holdets niveau er ikke en anden sportsgren.
  msoc: "soccer",
  wsoc: "soccer",
  soc: "soccer",
  "jv-mens-soccer": "soccer",
  "jv-womens-soccer": "soccer",
  "mens-soccer-reserves": "soccer",
  "womens-soccer-reserves": "soccer",
  "club-mens-soccer": "soccer",
  "club-womens-soccer": "soccer",
  mbball: "basketball",
  wbball: "basketball",
  "jv-mens-basketball": "basketball",
  "jv-womens-basketball": "basketball",
  mgolf: "golf",
  wgolf: "golf",
  mglf: "golf",
  wglf: "golf",
  mten: "tennis",
  wten: "tennis",
  mswim: "swimming-and-diving",
  wswim: "swimming-and-diving",
  swim: "swimming-and-diving",
  "c-swim": "swimming-and-diving",
  wvball: "volleyball",
  mvball: "volleyball",
  bvb: "volleyball",
  wgym: "gymnastics",
  mgym: "gymnastics",
  "jv-baseball": "baseball",
  "club-baseball": "baseball",
  "club-hockey": "ice-hockey",
  "mens-ice-hockey-acha-d2-": "ice-hockey",
  // Softball, lacrosse, wrestling, bowling, sejlsport, skydning, ski,
  // triatlon, ridning og cheer har fortsat BEVIDST ingen alias: de er ikke
  // baseball/volleyball/andet-i-forklædning, og en forkert etiket er værre
  // end "other" (jf. regel 5 i ARKITEKTUR-motor.md). Det samme gælder
  // ikke-sportslige "hold" som saac, band og hall-of-fame.
};

export function sportKeyFromSource(raw: string | null | undefined): SportKey {
  if (!raw) return "other";
  const v = raw.trim().toLowerCase();
  if (isSportKey(v)) return v;
  return SOURCE_ALIASES[v] ?? "other";
}

/** Ikon-id (Tabler Icons-sti slås op i CategoryNav). Sprogfrit. */
export const SPORT_ICONS: Record<SportKey, string> = {
  football: "football",
  basketball: "basketball",
  baseball: "baseball",
  soccer: "soccer",
  "track-and-field": "track-and-field",
  "swimming-and-diving": "swimming-and-diving",
  golf: "golf",
  tennis: "tennis",
  rowing: "rowing",
  gymnastics: "gymnastics",
  "ice-hockey": "ice-hockey",
  volleyball: "volleyball",
  "field-hockey": "field-hockey",
  rugby: "rugby",
  "water-polo": "water-polo",
  fencing: "fencing",
  squash: "squash",
  esports: "esports",
  other: "other",
};

export const SPORT_COLORS: Record<SportKey, string> = {
  football: "#4A6741",
  basketball: "#C2571A",
  baseball: "#8B2D2D",
  soccer: "#2D5A27",
  "track-and-field": "#2E6B8A",
  "swimming-and-diving": "#1B7A8A",
  golf: "#3D6B4F",
  tennis: "#8B6914",
  rowing: "#1A5276",
  gymnastics: "#8B3A62",
  "ice-hockey": "#2C3E6B",
  volleyball: "#A0522D",
  "field-hockey": "#2F6E63",
  rugby: "#6B4A2F",
  "water-polo": "#4A8FA8",
  fencing: "#7A6C8A",
  squash: "#8A4A5C",
  esports: "#5B4BA8",
  other: "#6B6B6B",
};

/** Emoji pr. sport (kampkort). Sprogfrit, som farver og ikoner. */
export const SPORT_EMOJI: Record<SportKey, string> = {
  football: "🏈",
  basketball: "🏀",
  baseball: "⚾",
  soccer: "⚽",
  "track-and-field": "🏃",
  "swimming-and-diving": "🏊",
  golf: "⛳",
  tennis: "🎾",
  rowing: "🚣",
  gymnastics: "🤸",
  "ice-hockey": "🏒",
  volleyball: "🏐",
  "field-hockey": "🏑",
  rugby: "🏉",
  "water-polo": "🤽",
  fencing: "🤺",
  // Squash har ingen emoji. Den sorte bold ER sportens kendetegn, så den får
  // lov at stå for sporten frem for en lånt ketsjer fra tennis eller badminton.
  squash: "⚫",
  esports: "🎮",
  other: "🏅",
};

export function sportEmoji(sport: string | null | undefined): string {
  const key = (sport ?? "").trim().toLowerCase();
  return isSportKey(key) ? SPORT_EMOJI[key] : SPORT_EMOJI.other;
}

export const FALLBACK_SPORT_COLOR = "#6B6B6B";

export function sportColor(sport: string | null | undefined): string {
  if (!sport) return FALLBACK_SPORT_COLOR;
  const key = sport.trim().toLowerCase();
  return isSportKey(key) ? SPORT_COLORS[key] : FALLBACK_SPORT_COLOR;
}

/** Boldspil — styrer verbet i profiltekster ("spiller X" vs. "svømmer"). */
export const BALL_SPORT_KEYS = new Set<SportKey>([
  "football",
  "basketball",
  "baseball",
  "soccer",
  "golf",
  "tennis",
  "ice-hockey",
  "volleyball",
  "field-hockey",
  "rugby",
  "water-polo",
  "squash",
  // Fægtning og esport står bevidst udenfor: man fægter, og en esportsudøver
  // spiller et SPIL, ikke en bold (verbet sættes i profile-baseline).
]);
