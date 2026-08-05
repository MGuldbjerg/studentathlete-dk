import { headers } from "next/headers";
import { COUNTRIES, countryProfile, type CountryProfile } from "./countries";
import { siteFromHost, siteBaseUrl } from "./site";

/**
 * Hvilket site betjener vi LIGE NU?
 *
 * `siteFromHost` er ren og testbar; den her henter blot værten ud af requesten.
 * Adskillelsen betyder at motorens logik kan unit-testes uden en Next-kontekst.
 *
 * Uden request-kontekst (pipeline-scripts, byggetid, unit-tests) falder vi
 * tilbage til standardsitet i stedet for at kaste — en profiltekst eller et
 * seed-script skal ikke gå ned, fordi der ikke er nogen HTTP-request.
 */
export async function currentSite(): Promise<CountryProfile> {
  try {
    const h = await headers();
    return siteFromHost(h.get("host"));
  } catch {
    return countryProfile();
  }
}

/**
 * HVILKET LANDS INDHOLD arbejder vi med i denne request?
 *
 * På de offentlige sider er svaret altid værtens land. I admin er det ikke:
 * admin bor kun på standardsitet (ét Cloudflare Access-app), men skal kunne
 * redigere ALLE landes indhold. Middlewaren sætter derfor `x-sa-country` på
 * admin-requests ud fra `sa_country`-cookien, og den header vinder her.
 *
 * Headeren kan kun komme fra vores egen middleware — den fjernes ikke af
 * Cloudflare, men middlewaren sætter den ubetinget på admin-stier og lader den
 * være urørt alle andre steder, så en klient kan ikke bruge den til at ændre
 * det offentlige sites indhold.
 */
export async function contentCountry(): Promise<string> {
  try {
    const h = await headers();
    const override = h.get("x-sa-country");
    if (override && COUNTRIES[override.toUpperCase()]) return override.toUpperCase();
    return siteFromHost(h.get("host")).code;
  } catch {
    return countryProfile().code;
  }
}

/** Sproget for det site der betjenes nu. Genvej til `currentSite().language`. */
export async function currentLanguage(): Promise<string> {
  return (await currentSite()).language;
}

/**
 * Absolut base-URL for DET site der betjenes nu.
 *
 * `BASE_URL` i seo.ts er en modul-konstant og kan derfor ikke variere pr.
 * request — den peger altid på standardsitet. Brugt til canonical-tags,
 * sitemap og feed ville UK-sitet erklære sig selv som en dublet af .dk-sitet,
 * og så ville Google formentlig aldrig indeksere det. Brug denne i alt der
 * udsender absolutte URL'er.
 */
export async function currentBaseUrl(): Promise<string> {
  return siteBaseUrl(await currentSite());
}

/**
 * `robots`-feltet til en sides metadata.
 *
 * Sider der selv sætter `robots: { index: true }` overskriver layoutets
 * noindex — og et dark launch-site ville så alligevel invitere crawlere ind på
 * netop de sider der har mest indhold. Brug denne i stedet: den siger stadig
 * "indeksér mig", men adlyder landeprofilens `darkLaunch`.
 */
export async function siteRobots(): Promise<{ index: boolean; follow: boolean }> {
  const dark = (await currentSite()).darkLaunch === true;
  return { index: !dark, follow: !dark };
}
