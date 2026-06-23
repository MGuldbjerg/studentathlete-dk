/**
 * Fanatics affiliate (Layer 2) — link- og disclosure-helpers. TEMPLATE.
 *
 * Status: IKKE aktiv / ikke wiret ind i artikelsider endnu. Pre-approval virker
 * links som almindelige (uattribuerede) butikslinks. Sådan aktiverer du:
 *   1. Bliv godkendt i BEGGE Impact-programmer (Fanatics US + Fanatics Int'l EU).
 *   2. Indsæt din fulde Impact deep-link-base i `trackingBase` pr. region og
 *      sæt `enabled: true`.
 *   3. Tilføj "fanatics" til CLICK_KINDS i src/lib/analytics.ts (beacon).
 *   4. Render <FanaticsAffiliateLink/> i artikelskabelonerne med skolens
 *      slug/region fra mappingen.
 *
 * Skole→slug/region-mapping (web-verificeret, 104 skoler):
 *   docs: "Mikkels eget/StudentAthlete.dk/fanatics-store-mapping.csv"
 *   EU-skoler → fanatics.de (EUR, EU-leveret). Alt andet → fanatics.com (+ told).
 */

export type FanaticsRegion = "us" | "eu";

interface ProgramConfig {
  enabled: boolean;
  /**
   * Fuld Impact deep-link-base (UDEN destination). Destinationen tilføjes som
   * ?u=<encoded butiks-URL>. Eksempel-format (indsæt din egen efter godkendelse):
   *   "https://fanatics.xnf4.net/c/<CAMPAIGN>/<ADID>/<PROGRAM>"
   * Lad stå tom indtil da.
   */
  trackingBase: string;
}

export const FANATICS: Record<
  FanaticsRegion,
  { storeBase: string; program: ProgramConfig }
> = {
  us: {
    storeBase: "https://www.fanatics.com/college",
    program: { enabled: false, trackingBase: "" }, // Fanatics US (Impact)
  },
  eu: {
    storeBase: "https://www.fanatics.de/de/college",
    program: { enabled: false, trackingBase: "" }, // Fanatics International EU (Impact)
  },
};

/** Påkrævet annonce-mærkning (FTC + EU). */
export const FANATICS_DISCLOSURE =
  "Annonce · StudentAthlete.dk kan tjene en kommission, hvis du handler via linket.";

/** Vises kun for US-butikken (told/moms ved levering til DK). */
export const FANATICS_CUSTOMS_NOTE =
  "Sendes fra USA — told og moms kan blive opkrævet ved levering til Danmark.";

/** Rå butiks-URL for en skole (slug delt på tværs af .com/.de). */
export function buildFanaticsStoreUrl(slug: string, region: FanaticsRegion): string {
  return `${FANATICS[region].storeBase}/${slug}`;
}

/**
 * Affiliate-URL: pakkes i Impact-tracking hvis programmet er konfigureret,
 * ellers returneres den rå butiks-URL (så templaten virker før godkendelse).
 * `subId` (fx artikel-slug) giver attribution pr. artikel i Impact-dashboardet.
 */
export function buildFanaticsAffiliateUrl(
  slug: string,
  region: FanaticsRegion,
  subId?: string,
): string {
  const dest = buildFanaticsStoreUrl(slug, region);
  const { program } = FANATICS[region];
  if (!program.enabled || !program.trackingBase) return dest;
  const sub = subId ? `&subId1=${encodeURIComponent(subId)}` : "";
  return `${program.trackingBase}?u=${encodeURIComponent(dest)}${sub}`;
}
