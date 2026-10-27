/**
 * Why a draft was rejected — the /admin dropdown (Mikkel, 2026-10-27).
 *
 * The codes are what the assignment desk's brief (pipeline/editor/brief.md)
 * needs to learn from: most of them map to one of its rules. Stored in
 * review_log.reject_reason (migration 076); labels are the admin's language.
 */
export const REJECT_REASONS = [
  { code: "not_news", label: "Ikke en historie om atleten (rolle for lille)" },
  { code: "line_only", label: "Kun en profillinje (liste, placering, kampdeltagelse)" },
  { code: "preview", label: "Forhåndsomtale — er ikke sket endnu" },
  { code: "unfinished", label: "Turneringen er ikke slut" },
  { code: "duplicate", label: "Dublet af en anden artikel" },
  { code: "wrong_athlete", label: "Forkert atlet eller identitet" },
  { code: "wrong_type", label: "Forkert vinkel/type (fx «skifter til» om en kamp)" },
  { code: "facts", label: "Faktafejl" },
  { code: "writing", label: "Teksten er for dårlig" },
  { code: "sensitive", label: "Følsomt (helbred, privat)" },
  { code: "other", label: "Andet" },
] as const;

/** `claude_editor`: rejected by Claude (the Opus editor, or a session on Mikkel's instruction); its reason is the note. */
export type RejectReason = (typeof REJECT_REASONS)[number]["code"] | "claude_editor";

export function isRejectReason(code: unknown): code is RejectReason {
  return code === "claude_editor" || REJECT_REASONS.some((r) => r.code === code);
}

/** A note is free text from the admin: trimmed, capped, empty → null. */
export function cleanNote(note: unknown): string | null {
  if (typeof note !== "string") return null;
  const t = note.trim().slice(0, 500);
  return t || null;
}
