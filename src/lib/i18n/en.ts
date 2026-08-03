/**
 * SPROGPAKKE: engelsk (britisk).
 * ==============================
 *
 * Til UK-sitet (student-athlete.co.uk) og senere engelsksprogede markeder
 * (AU/IE). Konventionen er BRITISK: "soccer" hedder "Football" for læseren,
 * amerikansk fodbold hedder "American Football", og atletik hedder "Athletics".
 *
 * NB om slugs: soccer får slugget "football" — det kanoniske nøgle-fallback i
 * `sportKeyFromSlug` rammer aldrig, fordi opslaget i slug-tabellen matcher
 * soccer først. American football ligger på "american-football".
 */
import type { LanguagePack } from "./types";
import type { SportKey } from "../sports";

/** Sportsnavn som det vises — britisk konvention. */
const sportLabel: Record<SportKey, string> = {
  football: "American Football",
  basketball: "Basketball",
  baseball: "Baseball",
  soccer: "Football",
  "track-and-field": "Athletics",
  "swimming-and-diving": "Swimming & Diving",
  golf: "Golf",
  tennis: "Tennis",
  rowing: "Rowing",
  gymnastics: "Gymnastics",
  "ice-hockey": "Ice Hockey",
  volleyball: "Volleyball",
  other: "Other",
};

/**
 * URL-slug pr. sport. Ændres disse, dør eksisterende links — de er en del af
 * sitets offentlige flade (samme regel som i da.ts).
 */
const sportSlug: Record<SportKey, string> = {
  football: "american-football",
  basketball: "basketball",
  baseball: "baseball",
  soccer: "football",
  "track-and-field": "athletics",
  "swimming-and-diving": "swimming",
  golf: "golf",
  tennis: "tennis",
  rowing: "rowing",
  gymnastics: "gymnastics",
  "ice-hockey": "ice-hockey",
  volleyball: "volleyball",
  other: "other",
};

/**
 * Position-begreb → engelsk formulering. Små bogstaver: de står midt i en
 * sætning ("… as a goalkeeper"). Britiske stavemåder hvor sportssproget har
 * dem (centre-back, defenceman, metre); amerikanske fagtermer beholdes hvor
 * selv britiske medier bruger dem (center i basketball, shortstop).
 */
const positionPhrase: Record<string, string> = {
  // Fodbold (soccer)
  goalkeeper: "goalkeeper",
  defender: "defender",
  centre_back: "centre-back",
  left_back: "left-back",
  right_back: "right-back",
  fullback: "full-back",
  midfielder: "midfielder",
  central_midfielder: "central midfielder",
  defensive_midfielder: "defensive midfielder",
  attacking_midfielder: "attacking midfielder",
  winger: "winger",
  striker: "striker",

  // Basketball
  guard: "guard",
  point_guard: "point guard",
  shooting_guard: "shooting guard",
  forward: "forward",
  small_forward: "small forward",
  power_forward: "power forward",
  center: "center",
  wing: "wing",

  // Baseball
  pitcher: "pitcher",
  right_handed_pitcher: "right-handed pitcher",
  left_handed_pitcher: "left-handed pitcher",
  starting_pitcher: "starting pitcher",
  relief_pitcher: "relief pitcher",
  catcher: "catcher",
  first_baseman: "first baseman",
  second_baseman: "second baseman",
  third_baseman: "third baseman",
  shortstop: "shortstop",
  infielder: "infielder",
  outfielder: "outfielder",
  left_fielder: "left fielder",
  center_fielder: "center fielder",
  right_fielder: "right fielder",
  designated_hitter: "designated hitter",
  utility: "utility player",

  // Amerikansk fodbold
  quarterback: "quarterback",
  running_back: "running back",
  halfback: "halfback",
  am_fullback: "fullback",
  wide_receiver: "wide receiver",
  tight_end: "tight end",
  offensive_lineman: "offensive lineman",
  offensive_tackle: "offensive tackle",
  offensive_guard: "offensive guard",
  defensive_lineman: "defensive lineman",
  defensive_end: "defensive end",
  defensive_tackle: "defensive tackle",
  linebacker: "linebacker",
  outside_linebacker: "outside linebacker",
  inside_linebacker: "inside linebacker",
  middle_linebacker: "middle linebacker",
  defensive_back: "defensive back",
  cornerback: "cornerback",
  safety: "safety",
  free_safety: "free safety",
  strong_safety: "strong safety",
  kicker: "kicker",
  placekicker: "placekicker",
  punter: "punter",
  long_snapper: "long snapper",
  athlete: "athlete",

  // Volleyball
  outside_hitter: "outside hitter",
  middle_blocker: "middle blocker",
  middle_hitter: "middle hitter",
  opposite_hitter: "opposite hitter",
  right_side_hitter: "right-side hitter",
  setter: "setter",
  libero: "libero",
  defensive_specialist: "defensive specialist",

  // Ishockey — britisk stavning "defenceman"
  defenseman: "defenceman",
  hockey_forward: "forward",
  left_wing: "left wing",
  right_wing: "right wing",

  // Svømning
  freestyle: "freestyle",
  backstroke: "backstroke",
  breaststroke: "breaststroke",
  butterfly: "butterfly",
  individual_medley: "individual medley",
  sprint: "sprint",
  distance: "distance",
  mid_distance: "middle distance",
  diver: "diver",
  diving: "diving",
  diving_1m: "1-metre diving",
  diving_3m: "3-metre diving",
  platform_diving: "platform diving",

  // Roning
  coxswain: "coxswain",
  port_side: "port side",
  starboard_side: "starboard side",
  sculler: "sculler",
  sweep_rower: "sweep rower",
  lightweight: "lightweight",

  // Gymnastik
  all_around: "all-around",
  vault: "vault",
  uneven_bars: "uneven bars",
  parallel_bars: "parallel bars",
  balance_beam: "balance beam",
  floor_exercise: "floor",
  pommel_horse: "pommel horse",
  rings: "rings",
  high_bar: "high bar",
};

/**
 * Engelsk behøver ingen translitteration — ikke-ASCII i navne (é, ø) håndteres
 * af den fælles slug-normalisering. Tabellen er tom med vilje.
 */
const transliterate: Record<string, string> = {};

export const en: LanguagePack = {
  code: "en",
  locale: "en-GB",
  sportLabel,
  sportSlug,
  positionPhrase,
  transliterate,
};
