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

import { cleanPosition } from "./roster-clean";
import { expandPosition } from "./positions";
import { BALL_SPORT_KEYS } from "./sports";
import { sportLabel } from "./i18n";
import { localizeHometown } from "./hometown";
import { countryProfile } from "./countries";
import { displaySchoolName, schoolLocation } from "./school-display-name";

// Fulde delstatsnavne — roster-data har forkortelser ("IL"), men ikke alle
// forkortelser er gennemskuelige for danske læsere (Mikkel 2026-07-08).
// "USA" udelades helt: alle atleter på sitet spiller i USA.
export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "Californien",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "Washington D.C.",
};

function stateName(abbrevOrName: string): string {
  return STATE_NAMES[abbrevOrName.toUpperCase()] ?? abbrevOrName;
}

export interface BaselineAthlete {
  name: string;
  preferred_name: string | null;
  university: string;
  university_state: string | null;
  /**
   * Skolens `common_name`. Profilteksten skriver det navn folk BRUGER, ikke
   * registernavnet — «North Carolina», ikke «University of North Carolina at
   * Chapel Hill». Se school-display-name.ts; tom værdi er ufarlig, så falder
   * vi tilbage på det officielle navn.
   */
  university_common_name?: string | null;
  /** Skolens by (`schools.city`) — «i Chapel Hill, North Carolina». */
  university_city?: string | null;
  sport: string;
  position: string | null;
  hometown: string | null;
  year_enrolled: number | null;
  expected_graduation: number | null;
  active: number;
  /** Atletens land (athletes.home_country) — styrer bystavemåde og landestrip. */
  home_country?: string | null;
}

/** Aktuel akademisk sæsons startår (US college-år løber aug–jul). */
export function currentSeasonStart(now: Date = new Date()): number {
  return now.getUTCMonth() + 1 >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/** "Fodbold" → "fodbold" (sport som dansk fællesnavn midt i en sætning). */
// Sporten gemmes nu som sprogfri nøgle ("soccer"); sætningen skal bruge det
// danske ord med lille begyndelsesbogstav ("… spiller fodbold").
function sportNoun(sport: string): string {
  return sportLabel(sport, "da").toLowerCase();
}

/** Fjern redundant landesuffiks fra roster-hjembyer ("Aarhus, Denmark" → "Aarhus"). */
/**
 * Hjembyen på dansk: skolens stavemåde ("Copenhagen", "Vaerloese") slås op i
 * landeprofilen, og ", Denmark" ryger — se `localizeHometown` i hometown.ts.
 * Landet kommer fra atleten selv; uden det er DK den rigtige antagelse for en
 * dansk profiltekst.
 */
function cleanHometown(hometown: string, homeCountry?: string | null): string {
  return localizeHometown(hometown, countryProfile(homeCountry ?? "DK"));
}

// ── Sportsspecifikke verber ───────────────────────────────────────────────────
// Dansk bruger IKKE "spille" om alle idrætter ("spillet svømning" er forkert
// — man "svømmer"; "spillet roning" er forkert — man "ror"). Mikkel 2026-07-08.
// Boldspil bruger fortsat "spille SPORT"; individuelle idrætter får deres eget
// verbum; atletik afgøres af disciplin (løb vs. kast/spring) via position-feltet
// når det er muligt — position-data er ofte grov/mangelfuld, så der er en
// generisk "dyrket atletik"-fallback når disciplinen ikke kan bestemmes.

interface SportVerb {
  present: string;         // "spiller", "svømmer", "løber", "kæmper", "dyrker"
  preteritum: string;      // "spillede", "svømmede", "løb", "kæmpede", "dyrkede"
  participle: string;      // "spillet", "svømmet", "løbet", "kæmpet", "dyrket"
  object: string;          // fx "fodbold" eller "i kuglestød" — "" hvis verbet er nok
  posNoun: string | null;  // klar til " som {posNoun}" — null hvis intet at vise
}

// athletes.sport er nu den sprogfri nøgle fra src/lib/sports.ts ("soccer",
// "swimming-and-diving"), IKKE et dansk ord. Listen over boldspil hører til
// kernen, fordi "er dette et boldspil" er sandt uanset sprog.

// Roster-position er ofte støj frem for en rigtig rolle: højde ("6'7\"",
// "5'9\"") eller holdniveau ("Varsity", "JV") — ingen af delene er en rolle,
// og vises derfor aldrig som " som X".
const HEIGHT_RE = /^\d+'\d*"?$/;
const ROSTER_TIER_RE = /^(varsity|novice|junior varsity|jv|freshman|redshirt)$/i;
/**
 * ÅRGANGSKODER der er havnet i position-feltet. Rosterne blander kolonnerne, og
 * uden dette skrev profilteksten «plays golf for Lamar in Texas as a Sr.-3L» —
 * en påstand om en rolle atleten ikke har. Dækker «Sr.», «R-Jr.», «Gr.» og
 * roningens år-på-holdet-suffiks («Sr.-3L», «So.-2L»).
 */
const CLASS_YEAR_RE = /^(r-)?(fr|so|jr|sr|gr|fy)\.?(-\d+l)?$/i;
/**
 * Bredere årgangs-markører: «2nd Year (2029-30)», «1st Year», «Class of 2028».
 * Et felt der indeholder et årstal eller et ordenstal + «year» er en årgang,
 * ikke en rolle — uanset hvordan skolen har skrevet det.
 */
const CLASS_YEAR_LOOSE_RE =
  /\b(19|20)\d{2}\b|\b\d+(st|nd|rd|th)\s+year\b|\bclass of\b|\b(first|second|third|fourth|fifth|sixth)\s+year\b/i;
// "Rower" gentager blot verbet "ror/roede/roet" og tilføjer intet — kun støj
// for roning; andre sportsgrenes ord filtreres ikke af denne (sport-specifik).
const REDUNDANT_ROLE_BY_SPORT: Record<string, RegExp> = { rowing: /^rower$/i };

/** Rå position → vis den som " som X", eller null hvis den er støj.
 *  Sprogfri støj-detektion — deles med de andre sprogs profil-grammatikker. */
export function meaningfulPosition(sport: string, position: string | null): string | null {
  if (!position) return null;
  const p = position.trim();
  if (!p || HEIGHT_RE.test(p) || ROSTER_TIER_RE.test(p) || CLASS_YEAR_RE.test(p)) return null;
  if (CLASS_YEAR_LOOSE_RE.test(p)) return null;
  if (REDUNDANT_ROLE_BY_SPORT[sport]?.test(p)) return null;
  return p;
}

// Atletik-disciplin ud fra position-feltet — data er ofte grov/mangelfuld, så
// der er en generisk "dyrket atletik"-fallback når disciplinen ikke kan
// bestemmes. Løbediscipliner vises som rolle ("som sprinter"); kaste-/spring-
// discipliner væves ind i selve verbet ("kæmper i kuglestød"), da "kæmper som
// kuglestød" ikke ville give mening grammatisk.
const RUNNING_EVENTS: { re: RegExp; noun: string }[] = [
  { re: /sprint/i, noun: "sprinter" },
  { re: /hurdle/i, noun: "hækkeløber" },
  { re: /relay/i, noun: "stafetløber" },
  { re: /cross\s*country/i, noun: "terrænløber" },
  { re: /middle/i, noun: "mellemdistanceløber" },
  { re: /distance|mile|marathon|\brun\b|race\s*walk/i, noun: "langdistanceløber" },
];

const FIELD_EVENTS: { re: RegExp; noun: string }[] = [
  { re: /shot\s*put/i, noun: "kuglestød" },
  { re: /discus/i, noun: "diskoskast" },
  { re: /javelin/i, noun: "spydkast" },
  { re: /hammer/i, noun: "hammerkast" },
  { re: /high\s*jump/i, noun: "højdespring" },
  { re: /long\s*jump/i, noun: "længdespring" },
  { re: /triple\s*jump/i, noun: "trespring" },
  { re: /pole\s*vault/i, noun: "stangspring" },
  { re: /weight/i, noun: "vægtkast" },
  { re: /decathlon/i, noun: "tikamp" },
  { re: /heptathlon/i, noun: "syvkamp" },
  { re: /multi|combined/i, noun: "mangekamp" },
  { re: /throw/i, noun: "kast" },
  { re: /jump/i, noun: "spring" },
];

function sportVerb(sportRaw: string, position: string | null): SportVerb {
  const sport = sportRaw.toLowerCase();
  if (BALL_SPORT_KEYS.has(sport as never)) {
    return { present: "spiller", preteritum: "spillede", participle: "spillet", object: sportNoun(sport), posNoun: meaningfulPosition(sport, position) };
  }
  if (sport === "swimming-and-diving") {
    // Svømmestil (Freestyle/IM/Fly …) er ægte information, ikke støj.
    return { present: "svømmer", preteritum: "svømmede", participle: "svømmet", object: "", posNoun: meaningfulPosition(sport, position) };
  }
  if (sport === "rowing") {
    // "Coxswain" er ægte information; "Rower" filtreres (gentager verbet).
    return { present: "ror", preteritum: "roede", participle: "roet", object: "", posNoun: meaningfulPosition(sport, position) };
  }
  if (sport === "fencing") {
    // Man fægter — våbnet (fleuret/kårde/sabel) er positionen.
    return { present: "fægter", preteritum: "fægtede", participle: "fægtet", object: "", posNoun: meaningfulPosition(sport, position) };
  }
  if (sport === "esports") {
    // "Dyrker esport" er ikke dansk. Man SPILLER — og titlen (League of
    // Legends, Valorant) står i positionsfeltet, fordi det er den skolen
    // rekrutterer til.
    return { present: "spiller", preteritum: "spillede", participle: "spillet", object: sportNoun(sport), posNoun: meaningfulPosition(sport, position) };
  }
  if (sport === "wrestling") {
    // Vægtklassen står i position-feltet og er ægte information.
    return { present: "bryder", preteritum: "brød", participle: "brudt", object: "", posNoun: meaningfulPosition(sport, position) };
  }
  if (sport === "sailing") {
    return { present: "sejler", preteritum: "sejlede", participle: "sejlet", object: "", posNoun: meaningfulPosition(sport, position) };
  }
  if (sport === "shooting") {
    return { present: "skyder", preteritum: "skød", participle: "skudt", object: "", posNoun: meaningfulPosition(sport, position) };
  }
  if (sport === "skiing") {
    // "Dyrker skisport" er stift; man står på ski. Disciplinen (alpint,
    // langrend) er positionen.
    return { present: "står på ski", preteritum: "stod på ski", participle: "stået på ski", object: "", posNoun: meaningfulPosition(sport, position) };
  }
  if (sport === "cycling") {
    // Disciplinen (landevej, bane, mountainbike) er positionen.
    return { present: "cykler", preteritum: "cyklede", participle: "cyklet", object: "", posNoun: meaningfulPosition(sport, position) };
  }
  if (sport === "archery") {
    // Samme verbum som skydning; buetypen står i position-feltet.
    return { present: "skyder", preteritum: "skød", participle: "skudt", object: "", posNoun: meaningfulPosition(sport, position) };
  }
  if (sport === "track-and-field") {
    if (position) {
      const running = RUNNING_EVENTS.find((r) => r.re.test(position));
      if (running) {
        return { present: "løber", preteritum: "løb", participle: "løbet", object: "", posNoun: running.noun };
      }
      const field = FIELD_EVENTS.find((f) => f.re.test(position));
      if (field) {
        return { present: "kæmper", preteritum: "kæmpede", participle: "kæmpet", object: `i ${field.noun}`, posNoun: null };
      }
    }
    return { present: "dyrker", preteritum: "dyrkede", participle: "dyrket", object: sportNoun("track-and-field"), posNoun: null };
  }
  // Fallback (Gymnastik + evt. fremtidige sportsgrene i SPORTS): "dyrke" er
  // grammatisk korrekt for stort set alle individuelle idrætter — i modsætning
  // til "spille", som kun boldspil bruger.
  // `other` = «vi kender ikke sportsgrenen». Nøglen må ikke læses højt
  // («dyrker other for Lake Forest») — så nævner vi den ikke.
  if (sport === "other") {
    return { present: "dyrker", preteritum: "dyrkede", participle: "dyrket", object: "", posNoun: meaningfulPosition(sport, position) };
  }
  return { present: "dyrker", preteritum: "dyrkede", participle: "dyrket", object: sportNoun(sport), posNoun: meaningfulPosition(sport, position) };
}

function withObject(verbForm: string, object: string): string {
  return object ? `${verbForm} ${object}` : verbForm;
}

/**
 * Basis-profiltekst på dansk. Bruger KUN felter der allerede vises i
 * fakta-sidebaren — teksten kan aldrig påstå noget nyt.
 */
/** Roster-navne bærer af og til dobbelt mellemrum («Leo  Jaukovic»). */
export function tidyName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

export function baselineProfile(a: BaselineAthlete, now: Date = new Date()): string {
  const fullName = tidyName(a.name);
  const firstName = a.preferred_name ?? fullName.split(" ")[0];
  // Udvid skolens forkortelse FØR alt andet: så bliver "F" til "forward",
  // "Midfielder" til "midtbanespiller", og atletik-koder som "SP" til det
  // engelske disciplinnavn, som disciplin-genkendelsen nedenfor forstår.
  const position = expandPosition(a.sport, cleanPosition(a.position));
  const v = sportVerb(a.sport, position);
  const posSuffix = v.posNoun ? ` som ${v.posNoun}` : "";
  // Skolens BRUGSNAVN, ikke registernavnet. Og navngiver det korte navn
  // allerede delstaten, udelades «i {delstat}» — ellers står der «North
  // Carolina i North Carolina». Se school-display-name.ts.
  const school = displaySchoolName(a.university, a.university_common_name);
  const place = schoolLocation(
    school,
    a.university_city,
    a.university_state ? stateName(a.university_state) : null,
  );
  const where = place ? `${school} i ${place}` : school;

  // Dimitteret = forbi 1. juni i dimissionsåret (samme skæring som 🎓-badgen,
  // men uden badge-vinduets slutdato — teksten skal forblive i datid).
  const hasGraduated =
    a.expected_graduation != null && now >= new Date(a.expected_graduation, 5, 1);

  let main: string;
  if (hasGraduated) {
    main = `${fullName} ${withObject(v.preteritum, v.object)} for ${where}${posSuffix} og dimitterede i ${a.expected_graduation}.`;
  } else if (!a.active) {
    main = `${fullName} ${v.preteritum} tidligere${v.object ? ` ${v.object}` : ""} for ${where}${posSuffix}.`;
  } else if (a.year_enrolled != null && a.year_enrolled >= currentSeasonStart(now)) {
    // Freshman-vindue: optaget i den igangværende (eller kommende) sæson.
    main = `${fullName} startede på ${school} i efteråret ${a.year_enrolled} og ${withObject(v.present, v.object)}${posSuffix}.`;
  } else if (a.year_enrolled != null) {
    main = `${fullName} har siden ${a.year_enrolled} ${withObject(v.participle, v.object)} for ${where}${posSuffix}.`;
  } else {
    main = `${fullName} ${withObject(v.present, v.object)} for ${where}${posSuffix}.`;
  }

  const parts = [main];
  if (a.hometown) {
    const home = cleanHometown(a.hometown, a.home_country);
    if (home) parts.push(`${firstName} kommer fra ${home}.`);
  }
  return parts.join(" ");
}
