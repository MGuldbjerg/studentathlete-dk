/**
 * Dimissions-badge (🎓): atleter forbliver AKTIVE med badge i ét år efter
 * dimission — vinduet hvor draft-/pro-kontrakt-nyheder er legitim dækning.
 * Først derefter pensioneres de (active=0) af pipeline/report/retire-graduates.ts.
 *
 * Vindue: 1. juni i dimissionsåret → 31. maj året efter (amerikansk dimission
 * ligger maj/juni). Afledt af expected_graduation — dukker atleten op på et
 * roster igen (5. år/redshirt), skubber scraperen året frem og badgen
 * forsvinder af sig selv.
 */
export function graduationBadgeYear(
  expectedGraduation: number | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!expectedGraduation) return null;
  const windowStart = new Date(expectedGraduation, 5, 1); // 1. juni
  const windowEnd = new Date(expectedGraduation + 1, 5, 1);
  return now >= windowStart && now < windowEnd ? expectedGraduation : null;
}
