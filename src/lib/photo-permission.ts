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
 * Everything else is allowed FOR NOW: NULL (never asked), `asked`, `granted`,
 * `conditional`. The stricter future rule is "granted-only" (plus conditional
 * on its conditions); it waits for Mikkel's separate decision about the roster
 * headshots already on the site, which were approved before any school was asked.
 */

/** The `schools.photo_permission` values that block every photo. */
export const BLOCKED_PHOTO_PERMISSIONS = ["declined", "do_not_contact", "do-not-contact"] as const;

const BLOCKED = new Set<string>(BLOCKED_PHOTO_PERMISSIONS);

/** May a photo from a school with this `schools.photo_permission` value be shown or suggested? */
export function photoAllowed(permission: string | null | undefined): boolean {
  if (!permission) return true;
  return !BLOCKED.has(permission.trim().toLowerCase());
}

/**
 * The same rule as SQL, for a query that must filter BEFORE its LIMIT (suggest-photos.ts:
 * filtering afterwards would let blocked athletes fill the nightly batch). Built from
 * the same list, so the two cannot drift; `_photo-permission-test.ts` checks they agree.
 */
export function photoAllowedSql(column: string): string {
  const list = BLOCKED_PHOTO_PERMISSIONS.map((v) => `'${v}'`).join(", ");
  // COALESCE: NULL (never asked) is allowed, and the expression is written once.
  return `COALESCE(lower(trim(${column})), '') NOT IN (${list})`;
}

/** The photo fields an athlete row carries. */
export interface PhotoFields {
  photo_url: string | null;
  photo_credit: string | null;
  photo_source_url?: string | null;
  photo_photographer?: string | null;
}

/**
 * A row whose school blocks photos, with every photo field emptied — "no photo"
 * to every renderer downstream (profile, cards, OG image, JSON-LD). The row read
 * from the database is not changed in the database.
 */
export function gatePhoto<T extends PhotoFields>(row: T, permission: string | null | undefined): T {
  if (photoAllowed(permission)) return row;
  return { ...row, photo_url: null, photo_credit: null, photo_source_url: null, photo_photographer: null };
}
