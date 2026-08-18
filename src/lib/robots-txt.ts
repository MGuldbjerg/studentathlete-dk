/**
 * Reglerne i robots.txt — som ren funktion, så de kan testes.
 * ==========================================================
 *
 * HVORFOR DEN FINDES. Da Amtrup-artiklen blev delt på Facebook 18. august 2026,
 * havde opslaget ingen billede. Billedet var i orden: `/api/og` svarede 200 med et
 * 1200×630 PNG, og Blueskys kort-tjeneste viste det fint samme dag. Fejlen var
 * vores robots.txt:
 *
 *     User-Agent: *
 *     Disallow: /api/          ← og OG-billedet ligger på /api/og
 *
 * Facebooks scraper (`facebookexternalhit`) respekterer robots.txt. Den hentede
 * altså siden, læste `og:image` — og lod være med at hente billedet. Resultatet er
 * et link-kort med titel og tekst, men uden billede, og Facebook husker den
 * tomme scrape i ca. 30 dage.
 *
 * Det gjaldt HVERT delt link, ikke kun dette: alle OG-billeder (artikler, atleter,
 * skoler) serveres fra `/api/og`.
 *
 * Rettelsen er en `Allow` der er MERE specifik end forbuddet. Både Google og Meta
 * følger længste-match-reglen, så `Allow: /api/og` slår `Disallow: /api/` — og
 * resten af API'et (sporing, admin, leads) bliver stadig holdt ude af indekset.
 */

/** Stien OG-billederne serveres fra. Skal altid være crawlbar. */
export const OG_IMAGE_PATH = "/api/og";

export interface RobotsRule {
  userAgent: string;
  allow?: string[];
  disallow?: string[];
}

/**
 * Regelsættet for et site.
 *
 * @param darkLaunch Et land der endnu ikke må indekseres, lukkes helt.
 */
export function robotsRules(darkLaunch: boolean): RobotsRule[] {
  if (darkLaunch) return [{ userAgent: "*", disallow: ["/"] }];
  return [
    {
      userAgent: "*",
      // Rækkefølgen betyder intet for standarden (længste match vinder), men
      // læses lettest med det specifikke først.
      allow: [OG_IMAGE_PATH, "/"],
      disallow: ["/admin/", "/api/"],
    },
  ];
}

/** Rendér til robots.txt-syntaks. Bruges af testen — Next renderer selv ruten. */
export function renderRobotsTxt(rules: RobotsRule[]): string {
  return rules
    .map((r) =>
      [
        `User-agent: ${r.userAgent}`,
        ...(r.allow ?? []).map((p) => `Allow: ${p}`),
        ...(r.disallow ?? []).map((p) => `Disallow: ${p}`),
      ].join("\n"),
    )
    .join("\n\n");
}
