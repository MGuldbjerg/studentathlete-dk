/**
 * Læservendte stier der bruges flere steder. Ét sted at rette, så en
 * omdøbning ikke efterlader døde links spredt i komponenterne.
 *
 * NB: stierne er danske, fordi de er en del af sitets offentlige flade. Når
 * site nummer to lander, hører de hjemme i sprogpakken sammen med
 * sport-sluggene (se ARKITEKTUR-motor.md).
 */

/** Arkivet: alle artikler, pagineret. Også målet for Instagram-bio-linket. */
export const ARCHIVE_PATH = "/artikler";

/** Sidetal-parameteren på arkivet. */
export const PAGE_PARAM = "side";

/** Kilde-parameteren vi hænger på delte links (`?kilde=ig`). */
export const SOURCE_PARAM = "kilde";
