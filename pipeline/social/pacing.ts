/**
 * Adaptiv pacing for social-køen.
 *
 * Idé: afstanden mellem opslag pr. kanal afhænger af kø-dybden — køen skal
 * kunne tømmes inden for drainTargetMinutes, men aldrig hurtigere end
 * minGapMinutes (hård grænse mod spam) og aldrig langsommere end
 * maxGapMinutes (så enkeltartikler ikke hænger unødigt).
 *
 * Friskhed: opslag der har stået i kø længere end expiryMinutes er ikke
 * længere nyheder og markeres 'expired' i stedet for at blive postet.
 */

export interface PacingConfig {
  minGapMinutes: number;
  maxGapMinutes: number;
  drainTargetMinutes: number;
  expiryMinutes: number;
}

export const DEFAULT_PACING: PacingConfig = {
  minGapMinutes: 60, // hård grænse: max 1 opslag/time/kanal
  maxGapMinutes: 180, // generøs spacing når køen er lille
  drainTargetMinutes: 24 * 60, // køen skal kunne tømmes på et døgn
  expiryMinutes: 48 * 60, // ældre i kø end 48t → expired
};

/**
 * D1's datetime('now') gemmer "YYYY-MM-DD HH:MM:SS" i UTC uden zone-suffix —
 * new Date() ville tolke det som lokal tid, så vi tilføjer Z selv.
 */
export function parseUtc(dbDate: string): Date {
  if (dbDate.includes("T") || dbDate.endsWith("Z")) return new Date(dbDate);
  return new Date(dbDate.replace(" ", "T") + "Z");
}

export function computeGapMinutes(
  queueDepth: number,
  cfg: PacingConfig = DEFAULT_PACING,
): number {
  if (queueDepth <= 0) return cfg.maxGapMinutes;
  const raw = cfg.drainTargetMinutes / queueDepth;
  return Math.min(cfg.maxGapMinutes, Math.max(cfg.minGapMinutes, raw));
}

export function shouldPostNow(
  lastPostedAt: string | null,
  queueDepth: number,
  now: Date = new Date(),
  cfg: PacingConfig = DEFAULT_PACING,
): boolean {
  if (queueDepth <= 0) return false;
  if (!lastPostedAt) return true;
  const elapsedMin = (now.getTime() - parseUtc(lastPostedAt).getTime()) / 60_000;
  return elapsedMin >= computeGapMinutes(queueDepth, cfg);
}

export function isExpired(
  queuedAt: string,
  now: Date = new Date(),
  cfg: PacingConfig = DEFAULT_PACING,
): boolean {
  const ageMin = (now.getTime() - parseUtc(queuedAt).getTime()) / 60_000;
  return ageMin > cfg.expiryMinutes;
}
