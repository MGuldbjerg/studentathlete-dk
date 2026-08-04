import { getSiteSettings } from "@/lib/admin";
import { adsenseIds } from "@/lib/site-content";

/**
 * /ads.txt — IAB Authorized Digital Sellers.
 *
 * To formål i ét: (1) det er DEN metode AdSense bruger til at bekræfte at
 * sitet er vores, og (2) det er filen annoncekøbere slår op for at se hvem der
 * må sælge vores plads. Uden den byder mange købere slet ikke.
 *
 * Bevidst valgt frem for AdSense-kodestumpen: stumpen indlæser Googles
 * annonce-JavaScript, som sætter cookies/tilgår enheden og derfor kræver
 * forudgående samtykke. Sitet er cookieløst indtil samtykkeboksen slås til
 * (`consent.enabled`), så vi verificerer med noget INERT i stedet.
 *
 * ID'et står i admin → Tekster (`adsense.publisher_id`), ikke i koden — så en
 * ny konto ikke kræver et deploy. Er feltet tomt, findes filen ikke (404), og
 * det er det rigtige svar: en tom eller forkert ads.txt er værre end ingen.
 */
/**
 * Dynamisk med vilje. Som statisk rute ville ID'et blive bagt ind ved BUILD,
 * og så ville et nyt ID i admin først virke efter et deploy — stik imod at alt
 * skal kunne redigeres uden kodeændring. Filen hentes sjældent, så ét
 * Worker-kald pr. anmodning er gratis; edge-cachen tager gentagelserne.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSiteSettings();
  const ids = adsenseIds(settings["adsense.publisher_id"]);

  if (!ids) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Feltrækkefølge er fastlagt af IAB-specifikationen:
  //   <annoncesystem>, <sælger-ID>, <DIRECT|RESELLER>, <certificerings-ID>
  // f08c47fec0942fa0 er Googles TAG-ID og er ens for alle udgivere.
  const body = `google.com, ${ids.seller}, DIRECT, f08c47fec0942fa0\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
