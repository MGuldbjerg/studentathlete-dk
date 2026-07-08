/**
 * Regelbaseret basis-profiltekst for atleter UDEN redaktionelt profilresumé.
 *
 * Bygges 100% deterministisk fra strukturerede roster-fakta (ingen LLM, ingen
 * hallucinationsrisiko) — men vises ALDRIG direkte på sitet: teksten lægges
 * som UDKAST i athletes.profile_draft (pipeline/profiles/build-profile-drafts.ts)
 * og skal godkendes i /admin/profiler før den bliver til profile_summary.
 * "Mennesker læser alt der publiceres" gælder også skabelon-tekst (Mikkel
 * 2026-07-08). Sommer-jobbet udvider senere godkendte profiler via
 * athlete_events (kildebelagte begivenheder) ad samme udkast→godkend-vej.
 */

export interface BaselineAthlete {
  name: string;
  preferred_name: string | null;
  university: string;
  university_state: string | null;
  sport: string;
  position: string | null;
  hometown: string | null;
  year_enrolled: number | null;
  expected_graduation: number | null;
  active: number;
}

/** Aktuel akademisk sæsons startår (US college-år løber aug–jul). */
export function currentSeasonStart(now: Date = new Date()): number {
  return now.getUTCMonth() + 1 >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/** "Fodbold" → "fodbold" (sport som dansk fællesnavn midt i en sætning). */
function sportNoun(sport: string): string {
  return sport.charAt(0).toLowerCase() + sport.slice(1);
}

/** Fjern redundant landesuffiks fra roster-hjembyer ("Aarhus, Denmark" → "Aarhus"). */
function cleanHometown(hometown: string): string {
  return hometown.replace(/,\s*(Denmark|Danmark)\s*$/i, "").trim();
}

/**
 * Basis-profiltekst på dansk. Bruger KUN felter der allerede vises i
 * fakta-sidebaren — teksten kan aldrig påstå noget nyt.
 */
export function baselineProfile(a: BaselineAthlete, now: Date = new Date()): string {
  const firstName = a.preferred_name ?? a.name.split(" ")[0];
  const sport = sportNoun(a.sport);
  const pos = a.position ? ` som ${a.position}` : "";
  const where = a.university_state
    ? `${a.university} i ${a.university_state}, USA`
    : a.university;

  // Dimitteret = forbi 1. juni i dimissionsåret (samme skæring som 🎓-badgen,
  // men uden badge-vinduets slutdato — teksten skal forblive i datid).
  const hasGraduated =
    a.expected_graduation != null && now >= new Date(a.expected_graduation, 5, 1);

  let main: string;
  if (hasGraduated) {
    main = `${a.name} spillede ${sport} for ${where}${pos} og dimitterede i ${a.expected_graduation}.`;
  } else if (!a.active) {
    main = `${a.name} spillede tidligere ${sport} for ${where}${pos}.`;
  } else if (a.year_enrolled != null && a.year_enrolled >= currentSeasonStart(now)) {
    // Freshman-vindue: optaget i den igangværende (eller kommende) sæson.
    main = `${a.name} startede på ${a.university} i efteråret ${a.year_enrolled} og spiller ${sport}${pos}.`;
  } else if (a.year_enrolled != null) {
    main = `${a.name} har siden ${a.year_enrolled} spillet ${sport} for ${where}${pos}.`;
  } else {
    main = `${a.name} spiller ${sport} for ${where}${pos}.`;
  }

  const parts = [main];
  if (a.hometown) {
    const home = cleanHometown(a.hometown);
    if (home) parts.push(`${firstName} kommer fra ${home}.`);
  }
  return parts.join(" ");
}
