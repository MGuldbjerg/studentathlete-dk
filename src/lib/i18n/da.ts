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
  "field-hockey": "Field hockey",
  rugby: "Rugby",
  "water-polo": "Vandpolo",
  fencing: "Fægtning",
  squash: "Squash",
  esports: "Esport",
  lacrosse: "Lacrosse",
  softball: "Softball",
  wrestling: "Brydning",
  bowling: "Bowling",
  sailing: "Sejlsport",
  shooting: "Skydning",
  skiing: "Skisport",
  triathlon: "Triatlon",
  polo: "Hestepolo",
  "flag-football": "Flag football",
  cycling: "Cykling",
  archery: "Bueskydning",
  "acrobatics-tumbling": "Akrobatik og tumbling",
  ultimate: "Ultimate",
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
  "field-hockey": "field-hockey",
  rugby: "rugby",
  "water-polo": "vandpolo",
  fencing: "faegtning",
  squash: "squash",
  esports: "esport",
  lacrosse: "lacrosse",
  softball: "softball",
  wrestling: "brydning",
  bowling: "bowling",
  sailing: "sejlsport",
  shooting: "skydning",
  skiing: "skisport",
  triathlon: "triatlon",
  // Hestepolo, ikke bare "polo" — /vandpolo ligger lige ved siden af.
  polo: "hestepolo",
  "flag-football": "flag-football",
  cycling: "cykling",
  archery: "bueskydning",
  // Sporten hedder "acrobatics & tumbling"; den danske URL bliver akrobatik.
  "acrobatics-tumbling": "akrobatik",
  ultimate: "ultimate",
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
  sweeper: "sweeper",
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
  // Rugby — dansk rugbysprog bruger de engelske pladsnavne, undtagen otteren
  prop: "prop",
  loosehead_prop: "loosehead prop",
  tighthead_prop: "tighthead prop",
  hooker: "hooker",
  lock: "lock",
  flanker: "flanker",
  number_eight: "nummer otte",
  scrum_half: "scrum half",
  fly_half: "fly half",
  centre: "center",
  inside_centre: "inside centre",
  outside_centre: "outside centre",
  back_row: "back row",
  front_row: "front row",
  back: "back",

  // Vandpolo
  driver: "driver",
  attacker: "angriber",
  hole_set: "hole set",
  hole_defender: "hole defender",
  two_meter: "to-meter-spiller",

  // Fægtning — våbnet er positionen
  epee: "kårde",
  foil: "fleuret",
  sabre: "sabel",

  // Esport — rollen i spillet (League of Legends-terminologien er den mest
  // udbredte; skolerne skriver den på engelsk, og det gør danske spillere også)
  top_lane: "toplaner",
  jungle: "jungler",
  mid_lane: "midlaner",
  bot_lane: "botlaner",
  ad_carry: "AD carry",
  support: "support",
  in_game_leader: "in-game leader",
  duelist: "duelist",
  controller: "controller",
  sentinel: "sentinel",
  initiator: "initiator",

  // Lacrosse
  attackman: "attackman",
  long_stick_midfielder: "long stick-midtbane",
  faceoff_specialist: "faceoff-specialist",
  draw_specialist: "draw-specialist",

  // Softball (resten af begreberne deles med baseball)
  designated_player: "designated player",
  flex: "flex",

  // Brydning — vægtklassen er tallet selv, kun sværvægt har et navn
  heavyweight: "sværvægt",

  // Sejlsport
  skipper: "rorsmand",
  crew: "gast",

  // Skydning
  smallbore: "smallbore",
  air_rifle: "luftgevær",
  pistol: "pistol",
  air_pistol: "luftpistol",
  trap: "trap",
  skeet: "skeet",

  // Skisport
  alpine: "alpint",
  nordic: "langrend",
  slalom: "slalom",
  giant_slalom: "storslalom",
  classic: "klassisk",

  // Flag football (resten af begreberne deles med amerikansk fodbold)
  rusher: "rusher",

  // Cykling
  sprinter: "sprinter",
  climber: "klatrer",
  road: "landevej",
  track_cycling: "bane",
  mountain_bike: "mountainbike",
  cyclocross: "cyclocross",
  gravel: "gravel",

  // Bueskydning — buetypen er disciplinen
  recurve: "recurve",
  compound: "compound",
  barebow: "barebow",
  bowhunter: "bowhunter",

  // Akrobatik og tumbling
  base: "base",
  top: "top",
  backspot: "backspot",
  tumbler: "tumbler",

  // Ultimate
  handler: "handler",
  cutter: "cutter",
  deep: "deep",

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

/**
 * Læservendte strenge. `{x}`-pladsholdere udfyldes af `t()`.
 * Dansk konvention: kun stort begyndelsesbogstav i overskrifter.
 */
const ui: LanguagePack["ui"] = {
  "nav.athletes": "Atleter",
  "nav.search_placeholder": "Søg efter atlet, skole …",
  "footer.sports": "Sportsgrene",
  "footer.about": "Om os",
  "footer.all_articles": "Alle artikler",
  "footer.all_athletes": "Alle atleter",
  "footer.universities": "Universiteter",
  "footer.knowledge": "Viden om NCAA",
  "footer.about_site": "Om os",
  "footer.contact": "Kontakt",
  "footer.ai_use": "Sådan bruger vi AI",
  "footer.press_ethics": "Presseetik & henvendelser",
  "footer.cookies": "Cookies",
  "footer.cookie_settings": "Cookieindstillinger",

  "home.latest": "Seneste artikler",
  "home.see_all": "Se alle",
  "home.see_all_articles": "Se alle artikler",
  "home.no_articles": "Ingen artikler endnu.",
  "home.no_matches": "Ingen artikler matcher din søgning.",
  "home.search_results_for": "Søgeresultater for «{q}»",
  "home.clear_filter": "Nulstil filter",
  "band.stats_label": "Sitet i tal",
  "band.athletes_tracked": "Danskere fulgt",
  "band.universities": "Universiteter",
  "band.sports": "Sportsgrene",
  "band.this_week": "Denne uge",
  "band.new": "nye",
  "band.by_sport": "Efter sport",
  "band.all_athletes": "Alle atleter",
  "band.athletes_count": "{n} atleter",

  "archive.title": "Alle artikler",
  "archive.meta_title_sport": "{sport} — alle artikler",
  "archive.meta_page": "side {page}",
  "archive.meta_description":
    "Alle artikler fra StudentAthlete.dk — danske college-atleter i USA, nyeste først.",
  "archive.showing": "Viser {from}–{to} af {total} artikler. Nyeste først.",
  "archive.page_missing": "Side {page} findes ikke — der er {total} artikler i alt.",
  "archive.none_yet": "Ingen artikler endnu.",
  "archive.none_on_page": "Ingen artikler på denne side.",
  "archive.back_to_first": "Tilbage til første side",
  "archive.filter_by_sport": "Filtrér efter sport",
  "archive.all": "Alle",
  "archive.pages": "Sider",
  "archive.page_x_of_y": "Side {page} af {last}",
  "archive.newer": "← Nyere",
  "archive.older": "Ældre →",

  "correction.prefix": "Rettet",
  "feed.description": "Dækning af {demonym} student athletes i USA",
  "ads.disclosure": "Annonce · {brand} kan tjene en kommission, hvis du handler via linket.",
  "ads.customs": "Sendes fra USA — told og moms kan blive opkrævet ved levering.",
  "time.now": "Lige nu",
  "time.minutes_ago": "{n} min. siden",
  "time.hours_ago": "{n}t siden",
  "time.days_ago": "{n}d siden",
  "card.read_time": "{n} min. læsning",
  "card.read_time_short": "{n} min.",
  "carousel.previous": "Forrige artikel",
  "carousel.next": "Næste artikel",
  "carousel.go_to": "Gå til artikel {n}",
  "carousel.empty_kicker": "StudentAthlete.dk",
  "carousel.empty_title": "Dansk dækning af student athletes i USA",
  "carousel.empty_body": "Artikler er på vej — kom tilbage snart.",

  "crumb.home": "Hjem",
  "crumb.aria": "Brødkrumme",

  "nav.search_submit": "Søg",
  "common.loading": "Indlæser...",
  "notfound.title": "Siden blev ikke fundet",
  "notfound.body": "Den side du leder efter eksisterer ikke eller er blevet flyttet.",
  "notfound.cta": "Gå til forsiden",

  "athletes.meta_title": "Alle atleter",
  "athletes.meta_description":
    "Oversigt over danske student athletes på amerikanske universiteter. Find din favorit og følg deres karriere.",
  "athletes.h1": "Danske atleter i USA",
  "athletes.active_count": "{n} aktive",
  "athletes.alumni_count": "{n} alumni",
  "athletes.none": "Ingen atleter registreret endnu.",
  "athletes.sort_label": "Sortér:",
  "athletes.sort_sport": "Sport",
  "athletes.sort_name": "Navn",
  "athletes.sort_school": "Skole",
  "athletes.grad_help_before": "Hatten markerer atleter, der er ",
  "athletes.grad_help_strong": "dimitteret inden for det seneste år",
  "athletes.grad_help_after":
    " — perioden, hvor vi stadig følger draft- og kontraktnyheder. Derefter flyttes de til ",
  "athletes.active_heading": "Aktive atleter",
  "athletes.none_active": "Ingen aktive atleter.",
  "athletes.alumni_heading": "Tidligere atleter",
  "athletes.show": "▼ Vis",
  "athletes.hide": "▲ Skjul",
  "athletes.unknown_school": "Ukendt skole",
  "athletes.graduated_title": "Færdiguddannet {year}",

  "schools.meta_title": "Universiteter med danske atleter",
  "schools.meta_description":
    "Overblik over de amerikanske universiteter, hvor danske student athletes går — sorteret efter NCAA-division med conference og antal danskere.",
  "schools.crumb": "Universiteter",
  "schools.intro_before":
    "De amerikanske universiteter, hvor vi følger danske student athletes — grupperet efter NCAA-division. Læs mere om forskellene i vores guide til ",
  "schools.intro_link": "divisioner i NCAA",
  "schools.counts": "{schools} universiteter · {athletes} danske atleter",
  "schools.none": "Ingen universiteter at vise endnu.",
  "schools.athlete_count_title": "{n} danske atleter",

  "guides.meta_title": "Viden om NCAA og college sport",
  "guides.meta_description":
    "Alt du skal vide om NCAA, college sport og danske atleter i USA. Guider til divisioner, conferences, eligibility, transfer portal og meget mere.",
  "guides.crumb": "Viden",
  "guides.intro":
    "Forstå det amerikanske college sport-system og følg danske atleter i NCAA. Her samler vi baggrundsviden og guider — fra divisioner og conferences til eligibility, transfer portal og de store mesterskaber.",
  "guides.read_more": "Læs mere →",
  "guides.lookup_heading": "Slå op",
  "guides.schools_card_title": "Universiteter med danske atleter",
  "guides.schools_card_body":
    "Overblik over de amerikanske universiteter, hvor danske student athletes går — sorteret efter division.",
  "guides.athletes_card_title": "Alle danske atleter",
  "guides.athletes_card_body":
    "Find og følg de danske atleter, vi dækker — på tværs af sportsgrene.",
  "guides.sports_heading": "Sportsgrene i NCAA",
  "guides.divisions_slug": "ncaa-divisioner",

  "sport.empty_note": "Atleter og nyheder tilføjes løbende.",
  "sport.active_athletes_label": "aktive atleter",
  "sport.articles_label": "artikler",
  "sport.athletes_heading": "Danske {sport}-atleter i USA",
  "sport.see_all_athletes": "Se alle atleter →",
  "sport.no_content": "Vi har endnu ikke indhold om {sport}.",
  "tpl.news_plural": "Nyheder",
  "tpl.features": "Features",
  "tpl.season_updates": "Sæsonopdateringer",
  "tpl.recruiting": "Rekruttering",
  "tpl.read_also": "Læs også",
  "tpl.related": "Relaterede artikler",
  "tpl.more_recruiting": "Mere om rekruttering",
  "tpl.previous_updates": "Tidligere opdateringer",
  "tpl.student_athlete_tag": "Student athlete",
  "tpl.official": "Officielt",

  "fact.name": "Navn",
  "fact.sport": "Sport",
  "fact.university": "Universitet",
  "fact.position": "Position",
  "fact.division": "Division",
  "fact.hometown": "Hjemby",
  "fact.home_country": "Danmark",
  "fact.state": "Stat",
  "fact.conference": "Conference",
  "fact.class_year": "Årgang",
  "fact.enrolled": "Optaget",
  "fact.expected_graduation": "Forventet dimission",
  "fact.status": "Status",
  "status.active": "Aktiv",
  "status.alumni": "Tidligere atlet",
  "status.graduated": "Færdiguddannet {year}",

  "profile.no_articles": "Ingen artikler endnu.",
  "school.athletes": "Danske atleter",
  "school.no_athletes": "Ingen registrerede atleter endnu.",
  "meta.sport_title": "{sport} – danske atleter i NCAA",
  "meta.athlete_description":
    "{name} spiller {sport} for {university}. Følg den danske student athlete på {brand}.",
  "meta.school_description": "Oversigt over danske student athletes ved {school}.",
  "meta.article_description": "Læs om {who} på {brand}",
};

/** Artikeltype som vist for læseren. */
const articleTypeLabel: Record<string, string> = {
  profile: "Spillerprofil",
  news: "Nyhed",
  feature: "Feature",
  season_update: "Sæsonopdatering",
  recruiting: "Rekruttering",
};

export const da: LanguagePack = {
  code: "da",
  locale: "da-DK",
  sportLabel,
  sportSlug,
  routes: { athletes: "atleter", schools: "skoler", guides: "viden", archive: "artikler" },
  params: { page: "side", source: "kilde" },
  articleTypeLabel,
  positionPhrase,
  transliterate,
  ui,
};
