/**
 * Instagram collab invites: our post invites the athletes it is about.
 * ====================================================================
 *
 * Mikkel, 2026-10-09: «start the collab invites now». An accepted invite puts
 * the post on the athlete's own profile as well — their followers see it.
 * Tagging was ruled out (2026-09-24) because it is not asked for; an invite
 * is, so the athlete decides.
 *
 * Guardrails, decided 2026-09-24 and enforced here, not by the adapter:
 *  - only a handle from the athlete's OWN school bio page (`name_match`);
 *    an `unverified` handle may be someone else, and inviting a stranger is
 *    exactly the spam this has to avoid
 *  - at most 3 per post (Meta's limit), the article's primary athlete first
 *  - at most one invite per athlete per 7 days
 *  - a declined invite pauses that athlete for 6 months
 *  - a private account makes Meta refuse the whole post, so the adapter
 *    retries WITHOUT collaborators — an invite must never cost a post
 *
 * Kill switch: SOCIAL_IG_COLLAB=0.
 */
import type { D1Client } from "../lib/d1-client";

export const MAX_COLLABORATORS = 3;
export const INVITE_GAP_DAYS = 7;
export const DECLINE_PAUSE_DAYS = 182;

export interface CollabCandidate {
  athlete_id: number;
  handle: string;
  /** 0 = the article's primary athlete. */
  ord: number;
  last_invite: string | null;
  last_decline: string | null;
}

export function collabEnabled(raw = process.env.SOCIAL_IG_COLLAB): boolean {
  return raw !== "0";
}

/** «@Louisbowden_ » → «louisbowden_». Instagram usernames are case-insensitive. */
export function normaliseHandle(h: string): string {
  return h.trim().replace(/^@/, "").toLowerCase();
}

const daysSince = (sqlTime: string, now: Date) =>
  (now.getTime() - new Date(sqlTime.replace(" ", "T") + (sqlTime.endsWith("Z") ? "" : "Z")).getTime()) / 86_400_000;

/** Which candidates may be invited on this post. Pure, so the rules are tested. */
export function pickCollaborators(candidates: CollabCandidate[], now: Date = new Date()): CollabCandidate[] {
  const seen = new Set<string>();
  return [...candidates]
    .sort((a, b) => a.ord - b.ord || a.athlete_id - b.athlete_id)
    .filter((c) => {
      const h = normaliseHandle(c.handle);
      if (!/^[a-z0-9._]{1,30}$/.test(h) || seen.has(h)) return false;
      if (c.last_decline && daysSince(c.last_decline, now) < DECLINE_PAUSE_DAYS) return false;
      if (c.last_invite && daysSince(c.last_invite, now) < INVITE_GAP_DAYS) return false;
      seen.add(h);
      return true;
    })
    .slice(0, MAX_COLLABORATORS);
}

/** The article's athletes from the channel's country with a verified handle. */
export async function loadCandidates(db: D1Client, articleId: number, country: string): Promise<CollabCandidate[]> {
  const { results } = await db.query<CollabCandidate>(
    `SELECT a.id AS athlete_id, a.instagram_handle AS handle,
            CASE WHEN a.id = ar.athlete_id THEN 0 ELSE 1 END AS ord,
            (SELECT MAX(i.invited_at) FROM ig_collab_invites i WHERE i.athlete_id = a.id) AS last_invite,
            (SELECT MAX(i.invited_at) FROM ig_collab_invites i WHERE i.athlete_id = a.id AND i.status = 'declined') AS last_decline
       FROM articles ar
       JOIN athletes a ON a.id = ar.athlete_id
                       OR a.id IN (SELECT aa.athlete_id FROM article_athletes aa WHERE aa.article_id = ar.id)
      WHERE ar.id = ? AND a.home_country = ?
        AND a.instagram_handle IS NOT NULL
        AND a.instagram_confidence = 'name_match'
        AND COALESCE(a.instagram_status, '') <> 'rejected'`,
    [articleId, country],
  );
  return results;
}

export async function recordInvites(
  db: D1Client,
  invited: CollabCandidate[],
  articleId: number,
  channel: string,
  mediaId: string | null,
): Promise<void> {
  for (const c of invited) {
    await db.execute(
      `INSERT INTO ig_collab_invites (athlete_id, article_id, channel, handle, media_id) VALUES (?, ?, ?, ?, ?)`,
      [c.athlete_id, articleId, channel, normaliseHandle(c.handle), mediaId],
    );
  }
}

/**
 * Meta's answer to «who did this post invite, and did they accept?».
 * Best effort: the field may not exist for every login type, and an unknown
 * answer must leave the row as it is, not guess.
 */
export function interpretCollaborators(
  body: unknown,
): Map<string, "accepted" | "declined" | "sent"> | null {
  const data = (body as { data?: { username?: string; invite_status?: string }[] })?.data;
  if (!Array.isArray(data)) return null;
  const out = new Map<string, "accepted" | "declined" | "sent">();
  for (const d of data) {
    if (!d.username) continue;
    const s = (d.invite_status ?? "").toUpperCase();
    out.set(normaliseHandle(d.username), s === "ACCEPTED" ? "accepted" : s === "DECLINED" ? "declined" : "sent");
  }
  return out;
}

/**
 * Read the status of invites still `sent` (1-30 days old) for one channel.
 * Fail-soft: logs once and stops when Meta does not answer the question.
 */
export async function refreshInviteStatus(db: D1Client, channel: string, graph: string, token: string): Promise<void> {
  const { results } = await db.query<{ media_id: string }>(
    `SELECT DISTINCT media_id FROM ig_collab_invites
      WHERE channel = ? AND status = 'sent' AND media_id IS NOT NULL
        AND invited_at < datetime('now', '-1 day') AND invited_at > datetime('now', '-30 days')
      LIMIT 20`,
    [channel],
  );
  for (const { media_id } of results) {
    const res = await fetch(
      `${graph}/${media_id}/collaborators?fields=username,invite_status&access_token=${encodeURIComponent(token)}`,
    );
    const statuses = res.ok ? interpretCollaborators(await res.json()) : null;
    if (!statuses) {
      console.log(`  ${channel}: collab status not readable (${res.status}) — invites stay 'sent'`);
      return;
    }
    for (const [handle, status] of statuses) {
      await db.execute(
        `UPDATE ig_collab_invites SET status = ?, checked_at = datetime('now')
          WHERE media_id = ? AND handle = ? AND status = 'sent'`,
        [status, media_id, handle],
      );
    }
  }
}
