/**
 * Regelbaseret basis-profiltekst på ENGELSK (britisk) — UK-sitets pendant til
 * `profile-baseline.ts`. Samme kontrakt, samme udkast→godkend-vej: teksten
 * vises ALDRIG direkte, den lægges som udkast og godkendes i /admin/profiler.
 *
 * Grammatikken er kode, ikke oversatte strenge (jf. profile-builders.ts):
 * engelsk siger "swims", ikke "plays swimming", og "competes in the shot put".
 * Rolle-suffikset normaliseres pr. sport ("as a freestyle SWIMMER", ikke
 * "as a freestyle") — dansk har ikke det behov, engelsk har.
 */

import { cleanPosition } from "./roster-clean";
import { expandPosition } from "./positions";
import { BALL_SPORT_KEYS } from "./sports";
import { sportLabel } from "./i18n";
import {
  STATE_NAMES,
  meaningfulPosition,
  currentSeasonStart,
  tidyName,
  type BaselineAthlete,
} from "./profile-baseline";
import { localizeHometown } from "./hometown";
import { displaySchoolName, nameContainsState } from "./school-display-name";
import { countryProfile } from "./countries";

// Delstatstabellen er engelsk i forvejen — kun det danske eksonym afviger.
const STATE_NAMES_EN: Record<string, string> = { ...STATE_NAMES, CA: "California" };

function stateName(abbrevOrName: string): string {
  return STATE_NAMES_EN[abbrevOrName.toUpperCase()] ?? abbrevOrName;
}

/** Sport som fællesnavn midt i en sætning. Egennavne beholder stort bogstav. */
function sportNoun(sport: string): string {
  const label = sportLabel(sport, "en");
  return label === "American Football" ? "American football" : label.toLowerCase();
}

/**
 * Fjern redundant landesuffiks: på UK-sitet er alle atleter fra UK, så
 * ", England"/", Scotland"/… siger ikke læseren noget (samme princip som
 * ", Denmark"-strip på DK-sitet).
 */
function cleanHometown(hometown: string, homeCountry?: string | null): string {
  return localizeHometown(hometown, countryProfile(homeCountry ?? "UK"));
}

/** "a"/"an" — med undtagelse for u-ord der udtales "ju" (a utility player). */
function article(noun: string): string {
  if (/^(uni|ut)/i.test(noun)) return "a";
  return /^[aeiou]/i.test(noun) ? "an" : "a";
}

// ── Rolle-normalisering pr. sport ────────────────────────────────────────────
// Sprogpakkens positionPhrase er disciplin-navne ("freestyle", "vault") — som
// rolle i en sætning skal de være person-betegnelser. Nøglerne er pakkens
// engelske formuleringer; ukendt formulering bruges som den er.

const SWIM_ROLES: Record<string, string> = {
  freestyle: "freestyle swimmer",
  backstroke: "backstroke swimmer",
  breaststroke: "breaststroke swimmer",
  butterfly: "butterfly swimmer",
  "individual medley": "individual medley swimmer",
  sprint: "sprint swimmer",
  distance: "distance swimmer",
  "middle distance": "middle-distance swimmer",
  diving: "diver",
  "1-metre diving": "1-metre diver",
  "3-metre diving": "3-metre diver",
  "platform diving": "platform diver",
};

const ROWING_ROLES: Record<string, string> = {
  "port side": "port-side rower",
  "starboard side": "starboard-side rower",
  lightweight: "lightweight rower",
};

const GYM_ROLES: Record<string, string> = {
  "all-around": "all-around gymnast",
};

function normalizeRole(sport: string, role: string): string {
  const key = role.toLowerCase();
  if (sport === "swimming-and-diving") {
    const known = SWIM_ROLES[key];
    if (known) return known;
    // Sammensatte discipliner («breaststroke/individual medley») står ikke i
    // tabellen, og uden dette blev sætningen «has swum ... as a
    // breaststroke/individual medley» — en disciplin brugt som personbetegnelse.
    if (/\b(swimmer|diver)\b/i.test(key)) return role;
    return `${role} swimmer`;
  }
  if (sport === "rowing") return ROWING_ROLES[key] ?? role;
  if (sport === "gymnastics") return GYM_ROLES[key] ?? `${role} specialist`;
  return role;
}

// ── Sportsspecifikke verber ──────────────────────────────────────────────────

interface SportVerb {
  present: string;     // "plays", "swims", "runs", "competes"
  past: string;        // "played", "swam", "ran", "competed"
  participle: string;  // "played", "swum", "run", "competed"
  object: string;      // fx "football" eller "in the shot put" — "" hvis verbet er nok
  posNoun: string | null;
}

const RUNNING_EVENTS: { re: RegExp; noun: string }[] = [
  { re: /sprint/i, noun: "sprinter" },
  { re: /hurdle/i, noun: "hurdler" },
  { re: /relay/i, noun: "relay runner" },
  { re: /cross\s*country/i, noun: "cross-country runner" },
  { re: /middle/i, noun: "middle-distance runner" },
  { re: /distance|mile|marathon|\brun\b|race\s*walk/i, noun: "distance runner" },
];

const FIELD_EVENTS: { re: RegExp; noun: string }[] = [
  { re: /shot\s*put/i, noun: "the shot put" },
  { re: /discus/i, noun: "the discus" },
  { re: /javelin/i, noun: "the javelin" },
  { re: /hammer/i, noun: "the hammer throw" },
  { re: /high\s*jump/i, noun: "the high jump" },
  { re: /long\s*jump/i, noun: "the long jump" },
  { re: /triple\s*jump/i, noun: "the triple jump" },
  { re: /pole\s*vault/i, noun: "the pole vault" },
  { re: /weight/i, noun: "the weight throw" },
  { re: /decathlon/i, noun: "the decathlon" },
  { re: /heptathlon/i, noun: "the heptathlon" },
  { re: /multi|combined/i, noun: "combined events" },
  { re: /throw/i, noun: "the throws" },
  { re: /jump/i, noun: "the jumps" },
];

function sportVerb(sportRaw: string, position: string | null): SportVerb {
  const sport = sportRaw.toLowerCase();
  const role = (p: string | null) => {
    const meaningful = meaningfulPosition(sport, p);
    return meaningful ? normalizeRole(sport, meaningful) : null;
  };
  if (BALL_SPORT_KEYS.has(sport as never)) {
    return { present: "plays", past: "played", participle: "played", object: sportNoun(sport), posNoun: role(position) };
  }
  if (sport === "swimming-and-diving") {
    return { present: "swims", past: "swam", participle: "swum", object: "", posNoun: role(position) };
  }
  if (sport === "rowing") {
    return { present: "rows", past: "rowed", participle: "rowed", object: "", posNoun: role(position) };
  }
  if (sport === "fencing") {
    return { present: "fences", past: "fenced", participle: "fenced", object: "", posNoun: role(position) };
  }
  if (sport === "esports") {
    return { present: "plays", past: "played", participle: "played", object: sportNoun(sport), posNoun: role(position) };
  }
  if (sport === "wrestling") {
    return { present: "wrestles", past: "wrestled", participle: "wrestled", object: "", posNoun: role(position) };
  }
  if (sport === "sailing") {
    return { present: "sails", past: "sailed", participle: "sailed", object: "", posNoun: role(position) };
  }
  if (sport === "shooting") {
    return { present: "shoots", past: "shot", participle: "shot", object: "", posNoun: role(position) };
  }
  if (sport === "skiing") {
    return { present: "skis", past: "skied", participle: "skied", object: "", posNoun: role(position) };
  }
  if (sport === "cycling") {
    return { present: "races", past: "raced", participle: "raced", object: "", posNoun: role(position) };
  }
  if (sport === "archery") {
    return { present: "shoots", past: "shot", participle: "shot", object: "", posNoun: role(position) };
  }
  if (sport === "track-and-field") {
    if (position) {
      const running = RUNNING_EVENTS.find((r) => r.re.test(position));
      if (running) {
        return { present: "runs", past: "ran", participle: "run", object: "", posNoun: running.noun };
      }
      const field = FIELD_EVENTS.find((f) => f.re.test(position));
      if (field) {
        return { present: "competes", past: "competed", participle: "competed", object: `in ${field.noun}`, posNoun: null };
      }
    }
    return { present: "competes", past: "competed", participle: "competed", object: `in ${sportNoun("track-and-field")}`, posNoun: null };
  }
  // `other` er nøglen for «vi kender ikke sportsgrenen» (se SOURCE_ALIASES i
  // sports.ts). Uden dette blev sætningen «has competed in other for Lake
  // Forest» — nøglen læst højt. Vi nævner den bare ikke.
  if (sport === "other") {
    return { present: "competes", past: "competed", participle: "competed", object: "", posNoun: role(position) };
  }
  // Fallback (gymnastik + fremtidige sportsgrene): "competes in X" er korrekt
  // for stort set alle individuelle idrætter.
  return { present: "competes", past: "competed", participle: "competed", object: `in ${sportNoun(sport)}`, posNoun: role(position) };
}

function withObject(verbForm: string, object: string): string {
  return object ? `${verbForm} ${object}` : verbForm;
}

/**
 * Basis-profiltekst på engelsk. Bruger KUN felter der allerede vises i
 * fakta-sidebaren — teksten kan aldrig påstå noget nyt.
 */
export function baselineProfileEn(a: BaselineAthlete, now: Date = new Date()): string {
  const fullName = tidyName(a.name);
  const firstName = a.preferred_name ?? fullName.split(" ")[0];
  const position = expandPosition(a.sport, cleanPosition(a.position), "en");
  const v = sportVerb(a.sport, position);
  const posSuffix = v.posNoun ? ` as ${article(v.posNoun)} ${v.posNoun}` : "";
  // Se den danske pendant: brugsnavn frem for registernavn, og ingen
  // «in {state}» når navnet allerede ER delstaten («Texas in Texas»).
  const school = displaySchoolName(a.university, a.university_common_name);
  const state = a.university_state ? stateName(a.university_state) : null;
  const where = state && !nameContainsState(school, state)
    ? `${school} in ${state}`
    : school;

  // Samme dimissions-skæring som den danske bygger (1. juni i dimissionsåret).
  const hasGraduated =
    a.expected_graduation != null && now >= new Date(a.expected_graduation, 5, 1);

  let main: string;
  if (hasGraduated) {
    main = `${fullName} ${withObject(v.past, v.object)} for ${where}${posSuffix} and graduated in ${a.expected_graduation}.`;
  } else if (!a.active) {
    main = `${fullName} previously ${withObject(v.past, v.object)} for ${where}${posSuffix}.`;
  } else if (a.year_enrolled != null && a.year_enrolled >= currentSeasonStart(now)) {
    main = `${fullName} started at ${school} in the autumn of ${a.year_enrolled} and ${withObject(v.present, v.object)}${posSuffix}.`;
  } else if (a.year_enrolled != null) {
    main = `${fullName} has ${withObject(v.participle, v.object)} for ${where}${posSuffix} since ${a.year_enrolled}.`;
  } else {
    main = `${fullName} ${withObject(v.present, v.object)} for ${where}${posSuffix}.`;
  }

  const parts = [main];
  if (a.hometown) {
    const home = cleanHometown(a.hometown, a.home_country);
    if (home) parts.push(`${firstName} is from ${home}.`);
  }
  return parts.join(" ");
}
