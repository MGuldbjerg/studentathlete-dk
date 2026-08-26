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

export type { LanguagePack, UiKey, RouteKey, ParamKey, SubRouteKey } from "./types";
import type { UiKey, RouteKey, ParamKey, SubRouteKey } from "./types";

export const LANGUAGES: Record<string, LanguagePack> = { da, en };

/** Sproget der bruges når intet andet er angivet (= standardsitets sprog). */
export const DEFAULT_LANGUAGE = "da";

/**
 * REDAKTIONENS sprog. `/admin` betjener ét menneske (Mikkel) og er dansk uanset
 * hvilket site der redigeres — modsat alt læservendt, hvor sproget følger
 * sitet. Konstanten findes for at gøre forskellen synlig i koden: står der
 * `ADMIN_LANG`, er dansk et VALG; stod der ingenting, var det et uheld.
 */
export const ADMIN_LANG = "da";

export function languagePack(code: string = DEFAULT_LANGUAGE): LanguagePack {
  return LANGUAGES[code] ?? LANGUAGES[DEFAULT_LANGUAGE];
}

/**
 * Læservendt streng på et givet sprog, med `{navn}`-pladsholdere udfyldt.
 *
 *   t("archive.showing", "en", { from: 1, to: 18, total: 18 })
 *   → "Showing 1–18 of 18 articles. Newest first."
 *
 * Ukendt nøgle kan ikke ske: `UiKey` er en union, så typechecken fanger det.
 */
export function t(
  key: UiKey,
  lang: string,
  vars?: Record<string, string | number>,
): string {
  const raw = languagePack(lang).ui[key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in vars ? String(vars[name]) : m,
  );
}

// ── Sport-opslag på et givet sprog ───────────────────────────────────────────

export function sportLabel(sport: string | null | undefined, lang: string): string {
  const pack = languagePack(lang);
  const key = (sport ?? "").trim().toLowerCase();
  return isSportKey(key) ? pack.sportLabel[key] : pack.sportLabel.other;
}

export function sportSlug(sport: string | null | undefined, lang: string): string {
  const pack = languagePack(lang);
  const key = (sport ?? "").trim().toLowerCase();
  return isSportKey(key) ? pack.sportSlug[key] : pack.sportSlug.other;
}

/** URL-slug → kanonisk nøgle. Omvendt opslag i sprogpakkens slug-tabel. */
export function sportKeyFromSlug(slug: string, lang: string): SportKey | null {
  const pack = languagePack(lang);
  const s = slug.trim().toLowerCase();
  for (const key of SPORT_KEYS) {
    if (pack.sportSlug[key] === s) return key;
  }
  // En kanonisk nøgle brugt direkte som slug accepteres også (fx /basketball).
  return isSportKey(s) ? s : null;
}

/**
 * URL-slug → kanonisk nøgle, uanset HVILKET sprogs tabel sluggen kommer fra.
 *
 * Bruges når en adresse skal genkendes for at kunne sendes videre til sitets
 * egen: `/fodbold/…` på det engelske site er ikke en gyldig adresse, men den er
 * genkendelig, og en 301 er bedre end en 404. Sitets EGET sprog spørges først,
 * så en slug der betyder to ting (dansk "football" = amerikansk fodbold,
 * engelsk "football" = soccer) altid tolkes som læseren på dette site ville.
 */
export function sportKeyFromSlugAnyLanguage(slug: string, preferredLang: string): SportKey | null {
  const first = sportKeyFromSlug(slug, preferredLang);
  if (first) return first;
  for (const code of Object.keys(LANGUAGES)) {
    const hit = sportKeyFromSlug(slug, code);
    if (hit) return hit;
  }
  return null;
}

/**
 * Artikeltype som vist for læseren ("Nyhed" / "News").
 * Ukendt type returneres uændret — vi opfinder ikke en etikette.
 */
export function articleTypeLabel(type: string | null | undefined, lang: string): string {
  const key = (type ?? "").trim();
  return languagePack(lang).articleTypeLabel[key] ?? key;
}

/** Sektionsstien på et sprog: `routeSlug("athletes", "en")` → "athletes". */
export function routeSlug(key: RouteKey, lang: string): string {
  return languagePack(lang).routes[key];
}

/** Sektionens sti med skråstreg foran — det man skriver i et href. */
export function routePath(key: RouteKey, lang: string): string {
  return `/${routeSlug(key, lang)}`;
}

/**
 * Sektions-slug → nøgle, uanset sprog. Bruges to steder: middlewaren, der
 * skriver sitets egen sti om til app-routerens (danske) mappe og sender de
 * andre sprogs stier videre med 308, og analytics, der skal kunne klassificere
 * /athletes og /atleter som samme sidetype.
 */
export function routeKeyFromSlug(slug: string): RouteKey | null {
  const s = slug.trim().toLowerCase();
  for (const pack of Object.values(LANGUAGES)) {
    for (const [key, value] of Object.entries(pack.routes)) {
      if (value === s) return key as RouteKey;
    }
  }
  return null;
}

/** Undersidens slug på et sprog: `subRouteSlug("athletesAll", "da")` → "alle". */
export function subRouteSlug(key: SubRouteKey, lang: string): string {
  return languagePack(lang).subroutes[key];
}

/**
 * Undersidens fulde sti. `athletesAll` hænger under atlet-sektionen, så
 * stien er sektionens sti + undersidens slug — begge sprogets egne.
 */
export function subRoutePath(key: SubRouteKey, lang: string): string {
  return `${routePath("athletes", lang)}/${subRouteSlug(key, lang)}`;
}

/** Læservendt query-parameter på et sprog: `?side=` / `?page=`. */
export function queryParam(key: ParamKey, lang: string): string {
  return languagePack(lang).params[key];
}

/**
 * Alle sprogs navne for en parameter. Læsesiden skal tage imod dem alle — et
 * delt link med `?kilde=ig` må ikke miste sin kilde, fordi læseren landede på
 * det engelske site.
 */
export function queryParamAliases(key: ParamKey): string[] {
  return [...new Set(Object.values(LANGUAGES).map((p) => p.params[key]))];
}

/** Navigationslisten: sportsgrene i visningsrækkefølge på ét sprog. */
export function sportNav(lang: string): Array<{ key: SportKey; label: string; slug: string }> {
  const pack = languagePack(lang);
  return SPORT_KEYS.map((key) => ({
    key,
    label: pack.sportLabel[key],
    slug: pack.sportSlug[key],
  }));
}
