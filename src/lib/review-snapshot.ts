/**
 * Afvisningen af en kladde — ét sted, fordi den sker tre steder.
 * =============================================================
 *
 * En kladde kan afvises fra /admin (`deleteArticle`), fra en redaktionel
 * gennemgang (`apply-draft-decisions.ts`) og af natkørslen
 * (`apply-draft-fix.ts`). Alle tre gjorde det samme i hver sin kopi, og så
 * driver de fra hinanden: da migration 051 gav natten en rettet tekst, lærte
 * KUN natkørslen at gemme den.
 *
 * Det kostede med det samme. Kladde #238 blev maskinrettet natten til 09-11
 * (1127 → 415 tegn) og afvist fra /admin to dage senere. `deleteArticle` kendte
 * ikke `fixed_snapshot`, så de 415 tegn er væk — og spørgsmålet «var det rimeligt
 * at afvise den RETTEDE tekst?» kan ikke længere besvares for den sag.
 *
 * Reglerne står derfor kun her:
 *
 *   `content_snapshot` = modellens OPRINDELIGE kladde. Migration 044's kontrakt.
 *      Det er modellen der måles, så den skal altid være udgangspunktet — også
 *      når maskinen har rettet siden.
 *   `fixed_snapshot`   = den maskinrettede tekst, hvis der er en, og hvis den
 *      adskiller sig. Ellers NULL; en kopi af samme tekst i to kolonner gør kun
 *      en senere læser i tvivl om der var en rettelse.
 *
 * Rækkefølgen af sletningerne er heller ikke til forhandling: `draft_reviews`
 * (migration 043) og `social_posts` (migration 018) PEGER på artiklen med en
 * fremmednøgle, og D1 håndhæver dem. En ren `DELETE FROM articles` fejlede med
 * FOREIGN KEY constraint failed — og /admin's afvis-knap svarede «Serverfejl»
 * på hver eneste kladde. Logbøgerne OM rækken kan ikke overleve den; det der
 * SKAL overleve, ligger i `review_log`, som ingen fremmednøgle har.
 */

/** Felterne en afvisning skal kende. Alle tre kaldere har dem i forvejen. */
export interface RejectableDraft {
  title: string | null;
  /** Kun brugt hvis `original_content` mangler — en manuelt oprettet kladde. */
  content?: string | null;
  original_content: string | null;
  claude_fixed_content?: string | null;
  article_type: string | null;
  fabrication_risk: string | null;
  sensitive: string | null;
  story_id: number | null;
  athlete_id: number | null;
}

/** Hvilke to tekster skal med i `review_log`? */
export function rejectSnapshot(row: RejectableDraft): {
  snapshot: string | null;
  fixed: string | null;
} {
  const snapshot = row.original_content ?? row.content ?? null;
  const fixed =
    row.claude_fixed_content && row.claude_fixed_content !== snapshot
      ? row.claude_fixed_content
      : null;
  return { snapshot, fixed };
}

/** Rækken der skal overleve artiklen. Skrives FØR sletningen. */
export const REJECT_LOG_SQL = `INSERT INTO review_log
    (article_id, decision, article_type, fabrication_risk, sensitive,
     content_snapshot, title_snapshot, story_id, athlete_id, fixed_snapshot)
  VALUES (?, 'rejected', ?, ?, ?, ?, ?, ?, ?, ?)`;

/** Parametrene til `REJECT_LOG_SQL`, i samme rækkefølge. */
export function rejectLogParams(id: number, row: RejectableDraft): unknown[] {
  const { snapshot, fixed } = rejectSnapshot(row);
  return [
    id,
    row.article_type,
    row.fabrication_risk,
    row.sensitive,
    snapshot,
    row.title,
    row.story_id,
    row.athlete_id,
    fixed,
  ];
}

/** Børnene før forælderen. Rækkefølgen er en fremmednøgle-regel, ikke en stil. */
export const REJECT_DELETE_SQL = [
  "DELETE FROM draft_reviews WHERE article_id = ?",
  "DELETE FROM social_posts WHERE article_id = ?",
  "DELETE FROM articles WHERE id = ?",
] as const;
