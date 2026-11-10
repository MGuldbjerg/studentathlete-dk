/**
 * The photo-permission gate (Mikkel, 2026-10-29). Pure, so the site, the
 * pipeline and the tests share one rule.
 *
 * The permission email promises: "If the answer is no, we will not use any
 * photo from {School}." So a school that declined, or asked not to be
 * contacted, has NO photo shown anywhere on the site and gets no new photo
 * suggestions. The gate is applied at READ time (the school's
 * `photo_permission` is selected with the athlete, through the
 * `schools.name = athletes.university` join that is already there), so a
 * decline takes effect on the next page render without deleting any data.
 *
 * The ledger (db/migration-068, pipeline/photos/permission-state.ts) writes
 * `do_not_contact` with an underscore; the hyphenated spelling is the CLI
 * keyword. Both are blocked, so a hand-written value cannot slip through.
 *
 * `athlete_list` (McKendree, 2026-11-09): the school allows photos only of
 * athletes it approved by name, and anyone new needs a separate email first.
 * Only an athlete with `athletes.photo_cleared = 1` (migration 087) keeps a
 * photo; an article photo from such a school needs every article athlete AT that
 * school cleared, and at least one of them (a school's yes covers its own athletes).
 *
 * Everything else is allowed FOR NOW: NULL (never asked), `asked`, `granted`,
 * `conditional`. The stricter future rule is "granted-only" (plus conditional
 * on its conditions); it waits for Mikkel's separate decision about the roster
 * headshots already on the site, which were approved before any school was asked.
 */

/** The `schools.photo_permission` values that block every photo. */
export const BLOCKED_PHOTO_PERMISSIONS = ["declined", "do_not_contact", "do-not-contact"] as const;

const BLOCKED = new Set<string>(BLOCKED_PHOTO_PERMISSIONS);

/** The school allows photos only of athletes it approved by name (see the header). */
export const ATHLETE_LIST = "athlete_list";

/** `athletes.photo_cleared` as read from D1 (1/0/NULL) or computed (boolean). */
export type Cleared = number | boolean | null | undefined;

/**
 * May a photo from a school with this `schools.photo_permission` value be shown or suggested?
 * `cleared` matters only for an `athlete_list` school, where nothing but 1/true passes.
 */
export function photoAllowed(permission: string | null | undefined, cleared?: Cleared): boolean {
  if (!permission) return true;
  const p = permission.trim().toLowerCase();
  if (p === ATHLETE_LIST) return cleared === 1 || cleared === true;
  return !BLOCKED.has(p);
}

/**
 * The same rule as SQL, for a query that must filter BEFORE its LIMIT (suggest-photos.ts:
 * filtering afterwards would let blocked athletes fill the nightly batch). Built from
 * the same list, so the two cannot drift; `_photo-permission-test.ts` checks they agree.
 */
export function photoAllowedSql(column: string, clearedColumn = "NULL"): string {
  const list = BLOCKED_PHOTO_PERMISSIONS.map((v) => `'${v}'`).join(", ");
  // COALESCE: NULL (never asked) is allowed. A simple CASE evaluates the permission once.
  return `(CASE COALESCE(lower(trim(${column})), '')
     WHEN '${ATHLETE_LIST}' THEN COALESCE(${clearedColumn}, 0) = 1
     ELSE COALESCE(lower(trim(${column})), '') NOT IN (${list}) END)`;
}

/**
 * Is an article's photo cleared for an `athlete_list` school? 1 when the article has
 * at least one athlete at the photo's school and all of them are cleared, else 0.
 * Runs only for an article that has a photo (PK lookups per linked athlete).
 */
export function articlePhotoClearedSql(alias: string): string {
  return `CASE WHEN ${alias}.photo_url IS NULL THEN NULL ELSE
    EXISTS (SELECT 1 FROM article_athletes pa JOIN athletes px ON px.id = pa.athlete_id
             WHERE pa.article_id = ${alias}.id AND px.university = ${alias}.photo_school)
    AND NOT EXISTS (SELECT 1 FROM article_athletes pa JOIN athletes px ON px.id = pa.athlete_id
             WHERE pa.article_id = ${alias}.id AND px.university = ${alias}.photo_school
               AND COALESCE(px.photo_cleared, 0) = 0) END`;
}

/** The photo fields an athlete row carries. */
export interface PhotoFields {
  photo_url: string | null;
  photo_credit: string | null;
  photo_source_url?: string | null;
  photo_photographer?: string | null;
  /** athletes.photo_cleared (migration 087), carried by `a.*`. */
  photo_cleared?: number | null;
}

/**
 * A row whose school blocks photos, with every photo field emptied — "no photo"
 * to every renderer downstream (profile, cards, OG image, JSON-LD). The row read
 * from the database is not changed in the database.
 */
export function gatePhoto<T extends PhotoFields>(row: T, permission: string | null | undefined): T {
  if (photoAllowed(permission, row.photo_cleared)) return row;
  return { ...row, photo_url: null, photo_credit: null, photo_source_url: null, photo_photographer: null };
}
