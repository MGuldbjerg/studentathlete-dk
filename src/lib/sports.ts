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
]);
