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
 * Two conditional yeses have their own state (migration 087):
 *
 * - `athlete_list` (McKendree, 2026-11-09): photos only of athletes the school
 *   approved by name; anyone new needs a separate email first. Only an athlete
 *   with `athletes.photo_cleared = 1` keeps a photo. An article photo from such a
 *   school needs every article athlete AT that school cleared, and at least one of
 *   them (a school's yes covers its own athletes).
 * - `photographer_list` (Rockhurst, 2026-11-10): only photos by photographers the
 *   school approved (`schools.photo_photographers`, a ';'-list stored lower-case).
 *   A photo with no photographer named passes only if `schools.photo_unnamed_ok = 1`
 *   (Rockhurst: its roster headshots are its own).
 *
 * Everything else is allowed FOR NOW: NULL (never asked), `asked`, `granted`,
 * `conditional`. The stricter future rule is "granted-only" (plus conditional
 * on its conditions); it waits for Mikkel's separate decision about the roster
 * headshots already on the site, which were approved before any school was asked.
 */

/** The `schools.photo_permission` values that block every photo. */
export const BLOCKED_PHOTO_PERMISSIONS = ["declined", "do_not_contact", "do-not-contact"] as const;

const BLOCKED = new Set<string>(BLOCKED_PHOTO_PERMISSIONS);

/** Photos only of athletes the school approved by name (see the header). */
export const ATHLETE_LIST = "athlete_list";
/** Photos only by photographers the school approved (see the header). */
export const PHOTOGRAPHER_LIST = "photographer_list";

/** A 0/1 flag as read from D1, or computed. */
export type Flag = number | boolean | null | undefined;
const isSet = (f: Flag) => f === 1 || f === true;

/** What a conditional state needs to know about the photo, besides the school's state. */
export interface PhotoContext {
  /** athletes.photo_cleared, or the article's articlePhotoClearedSql. */
  cleared?: Flag;
  /** The photo's credited photographer. */
  photographer?: string | null;
  /** schools.photo_photographers. */
  photographers?: string | null;
  /** schools.photo_unnamed_ok. */
  unnamedOk?: Flag;
}

/** A photographer name for comparing: trimmed, inner spaces collapsed, lower-case. */
export function normPhotographer(name: string | null | undefined): string {
  return (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** The stored form of an approved-photographer list (what the CLI writes). */
export function photographerListValue(names: string[]): string {
  return [...new Set(names.map(normPhotographer).filter(Boolean))].join(";");
}

/** Is this photographer approved by the school's list? An unnamed photo needs unnamedOk. */
export function photographerApproved(photographer: string | null | undefined, list: string | null | undefined, unnamedOk: Flag): boolean {
  const name = normPhotographer(photographer);
  if (!name) return isSet(unnamedOk);
  return (list ?? "").split(";").map(normPhotographer).includes(name);
}

/** May a photo from a school with this `schools.photo_permission` value be shown? */
export function photoAllowed(permission: string | null | undefined, ctx: PhotoContext = {}): boolean {
  if (!permission) return true;
  const p = permission.trim().toLowerCase();
  if (p === ATHLETE_LIST) return isSet(ctx.cleared);
  if (p === PHOTOGRAPHER_LIST) return photographerApproved(ctx.photographer, ctx.photographers, ctx.unnamedOk);
  return !BLOCKED.has(p);
}

/** SQL expressions for photoAllowedSql's context; each defaults to NULL. */
export interface PhotoContextSql {
  cleared?: string;
  photographer?: string;
  photographers?: string;
  unnamedOk?: string;
  /**
   * For "may we LOOK for a photo" (suggest-photos.ts): the photographer is unknown
   * until the photo is found, and the read-time gate checks it then.
   */
  anyPhotographer?: boolean;
}

/**
 * The same rule as SQL, for a query that must filter BEFORE its LIMIT (suggest-photos.ts:
 * filtering afterwards would let blocked athletes fill the nightly batch). Built from
 * the same lists, so the two cannot drift; `_photo-permission-test.ts` checks they agree.
 * The photographer match is trim + lower-case (no inner-space collapsing in SQL).
 */
export function photoAllowedSql(column: string, ctx: PhotoContextSql = {}): string {
  const list = BLOCKED_PHOTO_PERMISSIONS.map((v) => `'${v}'`).join(", ");
  const cleared = ctx.cleared ?? "NULL";
  const ph = ctx.photographer ?? "NULL";
  const phList = ctx.photographers ?? "NULL";
  const unnamed = ctx.unnamedOk ?? "NULL";
  const byPhotographer = ctx.anyPhotographer ? "1" : `CASE WHEN COALESCE(trim(${ph}), '') = '' THEN COALESCE(${unnamed}, 0) = 1
          ELSE instr(';' || COALESCE(${phList}, '') || ';', ';' || lower(trim(${ph})) || ';') > 0 END`;
  // COALESCE: NULL (never asked) is allowed. A simple CASE evaluates the permission once.
  return `(CASE COALESCE(lower(trim(${column})), '')
     WHEN '${ATHLETE_LIST}' THEN COALESCE(${cleared}, 0) = 1
     WHEN '${PHOTOGRAPHER_LIST}' THEN ${byPhotographer}
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
  /** schools.photo_photographers / photo_unnamed_ok, selected with the athlete. */
  school_photo_photographers?: string | null;
  school_photo_unnamed_ok?: number | null;
}

/**
 * A row whose school blocks photos, with every photo field emptied — "no photo"
 * to every renderer downstream (profile, cards, OG image, JSON-LD). The row read
 * from the database is not changed in the database.
 */
export function gatePhoto<T extends PhotoFields>(row: T, permission: string | null | undefined): T {
  const ctx: PhotoContext = {
    cleared: row.photo_cleared,
    photographer: row.photo_photographer,
    photographers: row.school_photo_photographers,
    unnamedOk: row.school_photo_unnamed_ok,
  };
  if (photoAllowed(permission, ctx)) return row;
  return { ...row, photo_url: null, photo_credit: null, photo_source_url: null, photo_photographer: null };
}
