/**
 * SPROGPAKKE: dansk.
 * ==================
 *
 * Alt sprogafhængigt for et dansksproget site samlet ét sted. Et tysk site
 * kopierer DENNE fil (ikke motoren), oversætter værdierne, og er færdigt.
 *
 * Indeholder bevidst BÅDE data og kode: `buildProfile` er dansk grammatik, ikke
 * en oversættelig streng. Dansk siger "svømmer", ikke "spiller svømning", og
 * "kæmper i kuglestød", ikke "som kuglestød". Den slags kan ikke ligge i en
 * strengtabel — derfor peger sprogpakken på en funktion.
 */
import type { LanguagePack } from "./types";
import type { SportKey } from "../sports";

/** Sportsnavn som det vises. */
const sportLabel: Record<SportKey, string> = {
  football: "Football",
  basketball: "Basketball",
  baseball: "Baseball",
  soccer: "Fodbold",
  "track-and-field": "Atletik",
  "swimming-and-diving": "Svømning",
  golf: "Golf",
  tennis: "Tennis",
  rowing: "Roning",
  gymnastics: "Gymnastik",
  "ice-hockey": "Ishockey",
  volleyball: "Volleyball",
  other: "Andet",
};

/**
 * URL-slug pr. sport. Læserne ser danske adresser (/fodbold), mens databasen
 * gemmer den kanoniske nøgle (soccer). Ændres disse, dør eksisterende links —
 * de er en del af sitets offentlige flade.
 */
const sportSlug: Record<SportKey, string> = {
  football: "football",
  basketball: "basketball",
  baseball: "baseball",
  soccer: "fodbold",
  "track-and-field": "atletik",
  "swimming-and-diving": "svoemning",
  golf: "golf",
  tennis: "tennis",
  rowing: "roning",
  gymnastics: "gymnastik",
  "ice-hockey": "ishockey",
  volleyball: "volleyball",
  other: "andet",
};

/**
 * Position-begreb → dansk formulering. Begreberne er sprogfri id'er fra
 * `positions.ts`; her bestemmes ordvalget.
 *
 * Med lille begyndelsesbogstav: de står midt i en sætning ("… som målmand").
 * Mangler et begreb her, bruges begrebets eget id — det er MED VILJE sådan
 * atletik virker: disciplin-id'erne ER de engelske øvelsesnavne, fordi den
 * danske grammatik genkender dem og selv vælger "kæmper i kuglestød".
 */
const positionPhrase: Record<string, string> = {
  // Fodbold
  goalkeeper: "målmand",
  defender: "forsvarsspiller",
  centre_back: "midterforsvarer",
  left_back: "venstre back",
  right_back: "højre back",
  fullback: "back",
  midfielder: "midtbanespiller",
  central_midfielder: "central midtbanespiller",
  defensive_midfielder: "defensiv midtbanespiller",
  attacking_midfielder: "offensiv midtbanespiller",
  winger: "kantspiller",
  striker: "angriber",

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
  right_handed_pitcher: "højrehåndet pitcher",
  left_handed_pitcher: "venstrehåndet pitcher",
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
  utility: "utility-spiller",

  // Amerikansk fodbold — dansk sportssprog bruger de engelske ord
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
  right_side_hitter: "right side hitter",
  setter: "setter",
  libero: "libero",
  defensive_specialist: "defensiv specialist",

  // Ishockey — dansk hockeysprog: målmand, back, angriber
  defenseman: "back",
  hockey_forward: "angriber",
  left_wing: "venstre wing",
  right_wing: "højre wing",

  // Svømning
  freestyle: "freestyle",
  backstroke: "rygcrawl",
  breaststroke: "brystsvømning",
  butterfly: "butterfly",
  individual_medley: "individuel medley",
  sprint: "sprint",
  distance: "distance",
  mid_distance: "mellemdistance",
  diver: "udspringer",
  diving: "udspring",
  diving_1m: "1-meter udspring",
  diving_3m: "3-meter udspring",
  platform_diving: "tårnudspring",

  // Roning
  coxswain: "styrmand",
  port_side: "bagbordsåre",
  starboard_side: "styrbordsåre",
  sculler: "sculler",
  sweep_rower: "åreroer",
  lightweight: "letvægtsroer",

  // Gymnastik
  all_around: "allround",
  vault: "spring",
  uneven_bars: "barre",
  parallel_bars: "barre",
  balance_beam: "bom",
  floor_exercise: "gulv",
  pommel_horse: "bensvingsstol",
  rings: "ringe",
  high_bar: "reck",
};

/**
 * Translitteration til URL-slugs. Dansk: æ→ae, ø→oe, å→aa. Tysk ville have
 * ü→ue og ß→ss her — derfor hører tabellen til i sprogpakken og ikke i kernen.
 */
const transliterate: Record<string, string> = {
  æ: "ae",
  ø: "oe",
  å: "aa",
  Æ: "ae",
  Ø: "oe",
  Å: "aa",
};

export const da: LanguagePack = {
  code: "da",
  locale: "da-DK",
  sportLabel,
  sportSlug,
  positionPhrase,
  transliterate,
};
