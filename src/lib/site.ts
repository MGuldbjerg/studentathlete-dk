/**
 * SITE-OPSLAG: værten bestemmer hvilket land der serveres.
 *
 * Før lå værten som en konstant tre steder (`CANONICAL_HOST` i middleware,
 * `BASE_URL` i seo.ts, `SITE_HOST` i track/lead) — altså tre steder at rette
 * ved site nummer to, og intet der koblede vært til land. Nu er registret her
 * afledt af landeprofilerne, så et nyt site er én landefil plus en route i
 * wrangler.toml.
 */
import { COUNTRIES, DEFAULT_COUNTRY, countryProfile, type CountryProfile } from "./countries";

/** vært (uden www.) → landekode. Bygget af profilerne, så de ikke kan divergere. */
const HOST_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.values(COUNTRIES).map((c) => [c.host.toLowerCase(), c.code]),
);

export function stripWww(host: string): string {
  return host.toLowerCase().split(":")[0].replace(/^www\./, "");
}

/**
 * Landeprofilen for en request-vært. Ukendt vært (workers.dev, localhost,
 * preview-URL) → standardsitet, så udvikling og previews virker uændret.
 */
export function siteFromHost(host: string | null | undefined): CountryProfile {
  if (!host) return countryProfile(DEFAULT_COUNTRY);
  return countryProfile(HOST_TO_COUNTRY[stripWww(host)] ?? DEFAULT_COUNTRY);
}

/** Er værten et kendt site? (Bruges til at afvise fremmede origins.) */
export function isKnownHost(host: string | null | undefined): boolean {
  return !!host && HOST_TO_COUNTRY[stripWww(host)] !== undefined;
}

/**
 * Sites der må nævnes udadtil — alt der ikke er dark launch.
 *
 * Et dark launch-site er noindex; et link til det fra et site der ER indekseret
 * ville sende crawlere derhen alligevel og dermed omgå selve spærren. Listen
 * bygges derfor af profilerne og ikke af en håndholdt liste i footeren, så et
 * nyt land hverken skal huskes eller kan glemmes.
 */
export function siteIsLive(profile: { darkLaunch?: boolean }): boolean {
  return profile.darkLaunch !== true;
}

export function liveSites(): CountryProfile[] {
  return Object.values(COUNTRIES).filter(siteIsLive);
}

export function siteBaseUrl(site: CountryProfile): string {
  return `https://${site.host}`;
}

/** User-agent til alt udgående pipeline-trafik. Ét sted, ikke otte. */
export function pipelineUserAgent(site: CountryProfile = countryProfile()): string {
  return `${site.brand}/1.0 (research, contact: ${site.contactEmail})`;
}
