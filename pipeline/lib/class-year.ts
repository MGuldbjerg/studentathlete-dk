/**
 * Deterministisk normalisering af NCAA class year (årgang).
 * Ingen AI-tokens — ren regelbaseret logik.
 */

export interface ClassYearResult {
  classYear: string | null;
  expectedGraduation: number | null;
  yearEnrolled: number | null;
}

interface ClassYearMapping {
  patterns: RegExp;
  normalized: string;
  /** Antal år til graduation fra rosterYear */
  gradOffset: number;
  /** Antal år siden enrollment relativt til rosterYear */
  enrolledOffset: number;
}

const MAPPINGS: ClassYearMapping[] = [
  // Redshirt-varianter FØRST (mere specifikke)
  { patterns: /^(r[- ]?fr\.?|rs[- ]?fr\.?|redshirt\s*freshman)$/i, normalized: "R-Fr.", gradOffset: 4, enrolledOffset: -1 },
  { patterns: /^(r[- ]?so\.?|rs[- ]?so\.?|redshirt\s*sophomore)$/i, normalized: "R-So.", gradOffset: 3, enrolledOffset: -2 },
  { patterns: /^(r[- ]?jr\.?|rs[- ]?jr\.?|redshirt\s*junior)$/i,   normalized: "R-Jr.", gradOffset: 2, enrolledOffset: -3 },
  { patterns: /^(r[- ]?sr\.?|rs[- ]?sr\.?|redshirt\s*senior)$/i,   normalized: "R-Sr.", gradOffset: 1, enrolledOffset: -4 },

  // Normale varianter
  { patterns: /^(fr\.?|freshman|1)$/i,                               normalized: "Fr.",   gradOffset: 4, enrolledOffset: 0 },
  { patterns: /^(so\.?|sophomore|2)$/i,                               normalized: "So.",   gradOffset: 3, enrolledOffset: -1 },
  { patterns: /^(jr\.?|junior|3)$/i,                                  normalized: "Jr.",   gradOffset: 2, enrolledOffset: -2 },
  { patterns: /^(sr\.?|senior|4)$/i,                                  normalized: "Sr.",   gradOffset: 1, enrolledOffset: -3 },

  // Graduate / 5th / 6th year
  { patterns: /^(gr\.?|graduate|grad|5th|6th)$/i,                     normalized: "Gr.",   gradOffset: 1, enrolledOffset: -4 },
];

/**
 * Beregn akademisk år ud fra en dato.
 * Måned >= 8 (august) → kalenderåret. Måned < 8 → kalenderåret - 1.
 */
export function getAcademicYear(date: Date = new Date()): number {
  return date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
}

/**
 * Normalisér en rå class year-streng og beregn graduation + enrollment.
 *
 * @param rawClassYear - Rå streng fra roster ("Jr.", "R-So.", "Freshman" osv.)
 * @param rosterAcademicYear - Det akademiske år rosteren tilhører (fx 2025)
 */
export function resolveClassYear(
  rawClassYear: string | null,
  rosterAcademicYear: number,
): ClassYearResult {
  if (!rawClassYear || !rawClassYear.trim()) {
    return { classYear: null, expectedGraduation: null, yearEnrolled: null };
  }

  const trimmed = rawClassYear.trim();

  for (const mapping of MAPPINGS) {
    if (mapping.patterns.test(trimmed)) {
      return {
        classYear: mapping.normalized,
        expectedGraduation: rosterAcademicYear + mapping.gradOffset,
        yearEnrolled: rosterAcademicYear + mapping.enrolledOffset,
      };
    }
  }

  // Ukendt format — gem rå værdi men beregn ikke datoer
  return { classYear: trimmed, expectedGraduation: null, yearEnrolled: null };
}
