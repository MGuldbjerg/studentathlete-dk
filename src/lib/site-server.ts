import { headers } from "next/headers";
import { countryProfile, type CountryProfile } from "./countries";
import { siteFromHost } from "./site";

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

/** Sproget for det site der betjenes nu. Genvej til `currentSite().language`. */
export async function currentLanguage(): Promise<string> {
  return (await currentSite()).language;
}
