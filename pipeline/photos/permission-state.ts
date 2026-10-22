/**
 * Rules for the photo-permission ledger (db/migration-068). Pure, so they can be tested
 * without a database. The point is never to contact anyone twice by accident.
 */

export type PermissionState = "asked" | "granted" | "conditional" | "declined" | "do_not_contact";

/** What Mikkel records when a reply arrives: keyword → event name, new state (null = unchanged). */
export const RESPONSES: Record<string, { event: string; state: PermissionState | null }> = {
  granted: { event: "reply_granted", state: "granted" },
  conditional: { event: "reply_conditional", state: "conditional" },
  declined: { event: "reply_declined", state: "declined" },
  forwarded: { event: "forwarded", state: null },
  bounced: { event: "bounced", state: null },
  "do-not-contact": { event: "do_not_contact", state: "do_not_contact" },
  note: { event: "note", state: null },
};

export function parseResponse(keyword: string): { event: string; state: PermissionState | null } {
  const r = RESPONSES[keyword];
  if (!r) throw new Error(`Unknown response «${keyword}». Use: ${Object.keys(RESPONSES).join(", ")}`);
  return r;
}

/** Days an address stays off-limits after any send, even across schools. */
export const EMAIL_COOLDOWN_DAYS = 90;

/** Can this address be mailed? False if it received a send within the cooldown. */
export function emailCooledDown(lastSentAt: string | null, now: Date, days = EMAIL_COOLDOWN_DAYS): boolean {
  if (!lastSentAt) return true;
  const sent = new Date(lastSentAt.replace(" ", "T") + "Z");
  return now.getTime() - sent.getTime() >= days * 86_400_000;
}

export function daysSince(at: string | null, now: Date): number | null {
  if (!at) return null;
  return Math.floor((now.getTime() - new Date(at.replace(" ", "T") + "Z").getTime()) / 86_400_000);
}
