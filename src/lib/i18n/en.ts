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

/**
 * Læservendte strenge. `{x}`-pladsholdere udfyldes af `t()`.
 *
 * NB `band.athletes_tracked`: den danske streng siger "Danskere fulgt", men
 * engelsk dækker flere lande (UK i dag, evt. AU/IE senere), så her står den
 * nationalitetsfri "Athletes tracked". Ellers skulle nationalitetsordet ligge
 * i landeprofilen — unødigt for én linje.
 */
const ui: LanguagePack["ui"] = {
  "nav.athletes": "Athletes",
  "nav.search_placeholder": "Search for an athlete or school …",
  "footer.sports": "Sports",
  "footer.about": "About",
  "footer.all_articles": "All articles",
  "footer.all_athletes": "All athletes",
  "footer.universities": "Universities",
  "footer.knowledge": "About the NCAA",
  "footer.about_site": "About us",
  "footer.contact": "Contact",
  "footer.ai_use": "How we use AI",
  "footer.press_ethics": "Editorial standards & complaints",
  "footer.cookies": "Cookies",
  "footer.cookie_settings": "Cookie settings",

  "home.latest": "Latest articles",
  "home.see_all": "See all",
  "home.see_all_articles": "See all articles",
  "home.no_articles": "No articles yet.",
  "home.no_matches": "No articles match your search.",
  "home.search_results_for": "Search results for “{q}”",
  "home.clear_filter": "Clear filter",
  "band.stats_label": "The site in numbers",
  "band.athletes_tracked": "Athletes tracked",
  "band.universities": "Universities",
  "band.sports": "Sports",
  "band.this_week": "This week",
  "band.new": "new",
  "band.by_sport": "By sport",
  "band.all_athletes": "All athletes",
  "band.athletes_count": "{n} athletes",

  "archive.title": "All articles",
  "archive.meta_title_sport": "{sport} — all articles",
  "archive.meta_page": "page {page}",
  "archive.meta_description":
    "Every article from Student-Athlete.co.uk — British college athletes in the United States, newest first.",
  "archive.showing": "Showing {from}–{to} of {total} articles. Newest first.",
  "archive.page_missing": "Page {page} does not exist — there are {total} articles in total.",
  "archive.none_yet": "No articles yet.",
  "archive.none_on_page": "No articles on this page.",
  "archive.back_to_first": "Back to the first page",
  "archive.filter_by_sport": "Filter by sport",
  "archive.all": "All",
  "archive.pages": "Pages",
  "archive.page_x_of_y": "Page {page} of {last}",
  "archive.newer": "← Newer",
  "archive.older": "Older →",

  "card.read_time": "{n} min read",
  "card.read_time_short": "{n} min",
  "carousel.previous": "Previous article",
  "carousel.next": "Next article",
  "carousel.go_to": "Go to article {n}",
  "carousel.empty_kicker": "Student-Athlete.co.uk",
  "carousel.empty_title": "British student athletes in the United States",
  "carousel.empty_body": "Articles are on the way — check back soon.",

  "crumb.home": "Home",
  "crumb.aria": "Breadcrumb",

  "nav.search_submit": "Search",
  "common.loading": "Loading…",
  "notfound.title": "Page not found",
  "notfound.body": "The page you are looking for does not exist, or it has moved.",
  "notfound.cta": "Go to the front page",

  "athletes.meta_title": "All athletes",
  "athletes.meta_description":
    "Every British student athlete we cover at American universities. Browse by sport, university or name and follow their careers.",
  "athletes.h1": "British athletes in the United States",
  "athletes.active_count": "{n} active",
  "athletes.alumni_count": "{n} alumni",
  "athletes.none": "No athletes on the site yet.",
  "athletes.sort_label": "Sort by:",
  "athletes.sort_sport": "Sport",
  "athletes.sort_name": "Name",
  "athletes.sort_school": "University",
  "athletes.grad_help_before": "The cap marks athletes who ",
  "athletes.grad_help_strong": "graduated within the past year",
  "athletes.grad_help_after":
    " — the window where we still follow draft and contract news. After that they move to ",
  "athletes.active_heading": "Current athletes",
  "athletes.none_active": "No current athletes.",
  "athletes.alumni_heading": "Former athletes",
  "athletes.show": "▼ Show",
  "athletes.hide": "▲ Hide",
  "athletes.unknown_school": "University unknown",
  "athletes.graduated_title": "Graduated {year}",

  "schools.meta_title": "Universities with British athletes",
  "schools.meta_description":
    "The American universities where the British student athletes we cover study — grouped by NCAA division, with conference and headcount.",
  "schools.crumb": "Universities",
  "schools.intro_before":
    "The American universities where we follow British student athletes — grouped by NCAA division. Read more about the differences in our guide to ",
  "schools.intro_link": "the NCAA divisions",
  "schools.counts": "{schools} universities · {athletes} British athletes",
  "schools.none": "No universities to show yet.",
  "schools.athlete_count_title": "{n} British athletes",

  "guides.meta_title": "Guides to the NCAA and college sport",
  "guides.meta_description":
    "What British student athletes and their families need to know about the NCAA and college sport: divisions, conferences, eligibility, the transfer portal and more.",
  "guides.crumb": "Guides",
  "guides.intro":
    "Understand how American college sport works, and follow the British athletes competing in the NCAA. This is where we collect the background — from divisions and conferences to eligibility, the transfer portal and the championships that matter.",
  "guides.read_more": "Read more →",
  "guides.lookup_heading": "Look up",
  "guides.schools_card_title": "Universities with British athletes",
  "guides.schools_card_body":
    "The American universities where the British student athletes we cover study — sorted by division.",
  "guides.athletes_card_title": "All British athletes",
  "guides.athletes_card_body":
    "Find and follow the British athletes we cover, across every sport.",
  "guides.sports_heading": "NCAA sports",
  "guides.divisions_slug": "ncaa-divisions",

  "sport.empty_note": "Athletes and news are added as we find them.",
  "sport.active_athletes_label": "current athletes",
  "sport.articles_label": "articles",
  "sport.athletes_heading": "British {sport} athletes in the United States",
  "sport.see_all_athletes": "See all athletes →",
  "sport.no_content": "We do not cover {sport} yet.",
  "tpl.news_plural": "News",
  "tpl.features": "Features",
  "tpl.season_updates": "Season updates",
  "tpl.recruiting": "Recruitment",
  "tpl.read_also": "Read next",
  "tpl.related": "Related articles",
  "tpl.more_recruiting": "More on recruitment",
  "tpl.previous_updates": "Earlier updates",
  "tpl.student_athlete_tag": "Student athlete",
  "tpl.official": "Official",

  "fact.name": "Name",
  "fact.sport": "Sport",
  "fact.university": "University",
  "fact.position": "Position",
  "fact.division": "Division",
  "fact.hometown": "Hometown",
  // Fallback når hjembyen er ukendt. Sproget dækker i dag kun UK; lander et
  // andet engelsksproget site (AU/IE), skal det her flyttes til landeprofilen.
  "fact.home_country": "United Kingdom",
  "fact.state": "State",
  "fact.conference": "Conference",
  "fact.class_year": "Class",
  "fact.enrolled": "Enrolled",
  "fact.expected_graduation": "Expected graduation",
  "fact.status": "Status",
  "status.active": "Active",
  "status.alumni": "Former athlete",
  "status.graduated": "Graduated {year}",

  "profile.no_articles": "No articles yet.",
  "school.athletes": "Athletes",
  "school.no_athletes": "No athletes registered yet.",
  "meta.sport_title": "{sport} – British athletes in the NCAA",
  "meta.athlete_description":
    "{name} plays {sport} for {university}. Follow the British student athlete on {brand}.",
  "meta.school_description": "British student athletes at {school}.",
  "meta.article_description": "Read about {who} on {brand}",
};

/** Artikeltype som vist for læseren. */
const articleTypeLabel: Record<string, string> = {
  profile: "Player profile",
  news: "News",
  feature: "Feature",
  season_update: "Season update",
  recruiting: "Recruitment",
};

export const en: LanguagePack = {
  code: "en",
  locale: "en-GB",
  sportLabel,
  sportSlug,
  articleTypeLabel,
  positionPhrase,
  transliterate,
  ui,
};
