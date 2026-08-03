/**
 * Sprogpakke-register.
 *
 * Motoren slår op her; den kender aldrig et konkret sprog. Nyt sprog =
 * ny fil ved siden af `da.ts` + én linje i `LANGUAGES`.
 */
import type { LanguagePack } from "./types";
import { da } from "./da";
import { en } from "./en";
import { SPORT_KEYS, type SportKey, isSportKey } from "../sports";

export type { LanguagePack } from "./types";

export const LANGUAGES: Record<string, LanguagePack> = { da, en };

/** Sproget der bruges når intet andet er angivet (= standardsitets sprog). */
export const DEFAULT_LANGUAGE = "da";

export function languagePack(code: string = DEFAULT_LANGUAGE): LanguagePack {
  return LANGUAGES[code] ?? LANGUAGES[DEFAULT_LANGUAGE];
}

// ── Sport-opslag på et givet sprog ───────────────────────────────────────────

export function sportLabel(sport: string | null | undefined, lang?: string): string {
  const pack = languagePack(lang);
  const key = (sport ?? "").trim().toLowerCase();
  return isSportKey(key) ? pack.sportLabel[key] : pack.sportLabel.other;
}

export function sportSlug(sport: string | null | undefined, lang?: string): string {
  const pack = languagePack(lang);
  const key = (sport ?? "").trim().toLowerCase();
  return isSportKey(key) ? pack.sportSlug[key] : pack.sportSlug.other;
}

/** URL-slug → kanonisk nøgle. Omvendt opslag i sprogpakkens slug-tabel. */
export function sportKeyFromSlug(slug: string, lang?: string): SportKey | null {
  const pack = languagePack(lang);
  const s = slug.trim().toLowerCase();
  for (const key of SPORT_KEYS) {
    if (pack.sportSlug[key] === s) return key;
  }
  // En kanonisk nøgle brugt direkte som slug accepteres også (fx /basketball).
  return isSportKey(s) ? s : null;
}

/** Navigationslisten: sportsgrene i visningsrækkefølge på ét sprog. */
export function sportNav(lang?: string): Array<{ key: SportKey; label: string; slug: string }> {
  const pack = languagePack(lang);
  return SPORT_KEYS.map((key) => ({
    key,
    label: pack.sportLabel[key],
    slug: pack.sportSlug[key],
  }));
}
