/**
 * The season calendar: when each college sport plays its regular season,
 * conference championships and national championships, per division.
 *
 * Month-level structure, not fixtures. Championship dates come from the NCAA's
 * 2026-27 prechampionship manuals and championship pages and the NAIA's
 * 2026-27 coaches' manuals, checked on 26 November 2026. Windows no official
 * source confirms (typical regular seasons, unpublished early rounds, most
 * All-American dates) carry `est: true` and are drawn as estimates.
 *
 * Next season: change `SEASON` and the dates below. Dates are "MM-DD"; months
 * August-December belong to `SEASON.startYear`, January-July to the year after.
 *
 * All reader-facing text is here in both site languages, like viden-content.
 * `localizeCalendar()` turns it into plain, language-specific data for the
 * client component, so the browser never receives the other language.
 */
import { languagePack, sportLabel } from "./i18n";
import type { SportKey } from "./sports";

/** `updated` is the date the dates were last checked against the sources (shown on the page). */
export const SEASON = { label: "2026–27", startYear: 2026, updated: "2026-11-26" } as const;

export const DIVISIONS = ["D1", "D2", "D3", "NAIA"] as const;
export type Division = (typeof DIVISIONS)[number];
export const DIVISION_LABEL: Record<Division, string> = { D1: "Division I", D2: "Division II", D3: "Division III", NAIA: "NAIA" };

export type PhaseKind = "off" | "ind" | "reg" | "conf" | "ncaa";
export type SeasonKey = "fall" | "winter" | "spring";

/** Text in both site languages. */
interface Txt { en: string; da: string }

interface Phase { k: PhaseKind; a: string; b: string; label: Txt; est?: boolean }
interface Marker { d: string; est?: boolean }
interface DivData { ph: Phase[]; aa: Marker[]; note?: Txt }
interface DivNone { none: Txt }
type DivEntry = DivData | DivNone;

interface CalendarSport {
  /** Stable id, also the URL hash (#tennis). */
  id: string;
  /** Site sport key: its label names the row, and its pillar page shows the row. */
  sport: SportKey;
  /** Overrides the site sport label (e.g. «Cross country» under athletics). */
  name?: Txt;
  sub?: Txt;
  season: SeasonKey;
  note: Txt;
  divs: Record<Division, DivEntry>;
  sources: Array<{ url: string; label: Txt }>;
}

const E = true;
const T = (en: string, da: string): Txt => ({ en, da });
const P = (k: PhaseKind, a: string, b: string, en: string, da: string, est?: boolean): Phase => ({ k, a, b, label: T(en, da), est });
const A = (d: string, est?: boolean): Marker => ({ d, est });
const none = (en: string, da: string): DivNone => ({ none: T(en, da) });
const same = (d: DivEntry, naia: DivEntry): Record<Division, DivEntry> => ({ D1: d, D2: d, D3: d, NAIA: naia });

const WOMEN = T("women", "kvinder");
const MEN = T("men", "herrer");
const S3 = "https://ncaaorg.s3.amazonaws.com/championships/";
const NAIA_DATES = { url: "https://www.naia.org/wp-content/uploads/2026/09/26-27-NAC-Sport-Liaison-Assignments.pdf", label: T("NAIA championship dates 2026-27", "NAIA: mesterskabsdatoer 2026-27") };
const src = (url: string, en: string, da: string) => ({ url, label: T(en, da) });

const SPORTS: CalendarSport[] = [
  // ───────────────────────────── Fall ─────────────────────────────
  {
    id: "soccer", sport: "soccer", season: "fall",
    note: T(
      "Two or three games a week from late August, then a knockout tournament through November and into December. Most NCAA squads also play a spring season of friendlies that does not count towards records.",
      "To-tre kampe om ugen fra slutningen af august og derefter en knockoutturnering gennem november og ind i december. De fleste NCAA-hold spiller også en forårssæson med træningskampe, som ikke tæller i statistikken.",
    ),
    divs: {
      D1: { ph: [P("reg", "08-20", "11-08", "Regular season", "Grundspil"), P("conf", "10-28", "11-15", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "11-19", "12-14", "NCAA tournament and College Cup in Cary, NC", "NCAA-turnering og College Cup i Cary, North Carolina"), P("off", "03-01", "04-30", "Spring season: training and friendlies", "Forårssæson: træning og træningskampe", E)], aa: [A("12-12", E)],
        note: T("The field is selected on 16 November. From 2026 the men's and women's College Cups share the second weekend of December (women 10 and 13 Dec, men 11 and 14 Dec).", "Feltet udtages 16. november. Fra 2026 spilles College Cup for kvinder og herrer samme weekend i december (kvinder 10. og 13. dec., herrer 11. og 14. dec.).") },
      D2: { ph: [P("reg", "08-28", "11-01", "Regular season", "Grundspil", E), P("conf", "10-25", "11-08", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "11-13", "12-05", "NCAA tournament, finals at the Division II Fall Festival in Kansas City", "NCAA-turnering, finaler ved Division II Fall Festival i Kansas City"), P("off", "03-01", "04-30", "Spring season", "Forårssæson", E)], aa: [],
        note: T("There is a ten-day gap between the quarterfinals (22 Nov) and the semifinals (3 Dec).", "Der går ti dage mellem kvartfinalerne (22. nov.) og semifinalerne (3. dec.).") },
      D3: { ph: [P("reg", "09-01", "11-01", "Regular season", "Grundspil", E), P("conf", "10-25", "11-08", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "11-14", "12-06", "NCAA tournament, finals in Columbus, OH", "NCAA-turnering, finaler i Columbus, Ohio")], aa: [],
        note: T("64-team fields for men and women. Division III allows only a limited spring segment.", "64 hold i både kvinde- og herreturneringen. Division III tillader kun en begrænset forårssæson.") },
      NAIA: { ph: [P("reg", "08-20", "11-11", "Regular season", "Grundspil"), P("conf", "10-28", "11-11", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "11-19", "12-07", "Opening rounds, then the final site (men in Orange Beach, AL, women in Decatur, AL)", "Indledende runder og derefter slutrunden (herrer i Orange Beach, kvinder i Decatur, begge Alabama)")], aa: [A("12-14")] },
    },
    sources: [
      src(S3 + "sports/soccer/d1/men/2026-27D1MSO_PreChampsManual.pdf", "NCAA Division I men's soccer manual 2026-27", "NCAA: manual for Division I herrefodbold 2026-27"),
      src(S3 + "sports/soccer/d1/women/2026-27D1WSO_PreChampsManual.pdf", "NCAA Division I women's soccer manual 2026-27", "NCAA: manual for Division I kvindefodbold 2026-27"),
      src(S3 + "sports/soccer/d3/common/2026-27D3XSO_PrechampionshipsManual.pdf", "NCAA Division III soccer manual 2026-27", "NCAA: manual for Division III fodbold 2026-27"),
      src("https://www.naia.org/wp-content/uploads/2026/08/2026-27-MSOC-Coaches-Manual.pdf", "NAIA men's soccer coaches' manual 2026-27", "NAIA: trænermanual for herrefodbold 2026-27"),
    ],
  },
  {
    id: "american-football", sport: "football", season: "fall",
    note: T(
      "Twelve weekly games from late August to late November, then play-offs. The top level of Division I (FBS) ends with the College Football Playoff in January; the other levels play ordinary knockout play-offs.",
      "Tolv kampe, én om ugen, fra slutningen af august til slutningen af november og derefter slutspil. Det øverste niveau i Division I (FBS) slutter med College Football Playoff i januar; de øvrige niveauer spiller et almindeligt knockout-slutspil.",
    ),
    divs: {
      D1: { ph: [P("reg", "08-29", "11-28", "Regular season (FBS)", "Grundspil (FBS)"), P("conf", "12-04", "12-05", "Conference championship games", "Conference-finaler"), P("ncaa", "12-18", "01-25", "College Football Playoff, final in Las Vegas", "College Football Playoff, finale i Las Vegas"), P("off", "03-01", "04-25", "Spring practice", "Forårstræning", E)], aa: [A("12-16", E)],
        note: T("The second tier of Division I (FCS) plays its own play-off from 28 November to the final in Nashville on 11 January.", "Andet niveau i Division I (FCS) spiller sit eget slutspil fra 28. november til finalen i Nashville 11. januar.") },
      D2: { ph: [P("reg", "08-29", "11-14", "Regular season", "Grundspil", E), P("ncaa", "11-21", "12-19", "NCAA play-offs, final in McKinney, TX", "NCAA-slutspil, finale i McKinney, Texas"), P("off", "03-01", "04-25", "Spring practice", "Forårstræning", E)], aa: [A("12-10", E)] },
      D3: { ph: [P("reg", "09-05", "11-14", "Regular season", "Grundspil", E), P("ncaa", "11-21", "01-03", "NCAA play-offs, Stagg Bowl in Salem, VA", "NCAA-slutspil, Stagg Bowl i Salem, Virginia")], aa: [],
        note: T("The final moved into January for 2026–27.", "Finalen er rykket ind i januar i 2026–27.") },
      NAIA: { ph: [P("reg", "08-27", "11-14", "Regular season", "Grundspil"), P("ncaa", "11-21", "12-19", "NAIA play-offs, final in Fort Worth, TX", "NAIA-slutspil, finale i Fort Worth, Texas")], aa: [A("12-15")] },
    },
    sources: [
      src("https://fbschedules.com/college-football-playoff-sets-2026-27-schedule-kickoff-times-tv-designations/", "College Football Playoff schedule 2026-27", "College Football Playoff: program 2026-27"),
      src(S3 + "sports/football/d1/2026-27D1MFB_PreChampManual.pdf", "NCAA FCS championship manual 2026-27", "NCAA: manual for FCS-mesterskabet 2026-27"),
      src(S3 + "sports/football/d2/2026-27D2MFB_PreChampsManual.pdf", "NCAA Division II football manual 2026-27", "NCAA: manual for Division II football 2026-27"),
      src(S3 + "sports/football/d3/2026-27D3MFB_PreChampsionshipManual.pdf", "NCAA Division III football manual 2026-27", "NCAA: manual for Division III football 2026-27"),
      src("https://www.naia.org/wp-content/uploads/2026/09/2026-27-NAIA-Football-Coaches-Manual.pdf", "NAIA football coaches' manual 2026-27", "NAIA: trænermanual for football 2026-27"),
    ],
  },
  {
    id: "field-hockey", sport: "field-hockey", sub: WOMEN, season: "fall",
    note: T("One of the earliest sports to finish: Divisions I and III crown their champions on 22 November.", "En af de sportsgrene der slutter tidligst: Division I og III kårer deres mestre 22. november."),
    divs: {
      D1: { ph: [P("reg", "08-28", "11-01", "Regular season", "Grundspil", E), P("conf", "11-01", "11-08", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "11-11", "11-22", "NCAA championship, final four in Louisville, KY", "NCAA-mesterskab, final four i Louisville, Kentucky")], aa: [A("12-16", E)],
        note: T("Selection is on 8 November.", "Feltet udtages 8. november.") },
      D2: { ph: [P("reg", "08-28", "11-07", "Regular season", "Grundspil", E), P("conf", "11-05", "11-15", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "11-21", "12-05", "NCAA championship, final at the Division II Fall Festival in Kansas City", "NCAA-mesterskab, finale ved Division II Fall Festival i Kansas City")], aa: [] },
      D3: { ph: [P("reg", "09-01", "11-01", "Regular season", "Grundspil", E), P("conf", "11-01", "11-08", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "11-11", "11-22", "NCAA championship, finals in Geneva, NY", "NCAA-mesterskab, finaler i Geneva, New York")], aa: [] },
      NAIA: none("No NAIA field hockey championship found", "Intet NAIA-mesterskab i field hockey fundet"),
    },
    sources: [
      src(S3 + "sports/fieldhockey/d1/2026-27D1WFH_PreChamps.pdf", "NCAA Division I field hockey manual 2026-27", "NCAA: manual for Division I field hockey 2026-27"),
      src(S3 + "sports/fieldhockey/d2/2026-27_DIIWFH_PrechampsManual.pdf", "NCAA Division II field hockey manual 2026-27", "NCAA: manual for Division II field hockey 2026-27"),
      src(S3 + "sports/fieldhockey/d3/2026-27D3WFH_PreChampsManual.pdf", "NCAA Division III field hockey manual 2026-27", "NCAA: manual for Division III field hockey 2026-27"),
    ],
  },
  {
    id: "volleyball", sport: "volleyball", sub: WOMEN, season: "fall",
    note: T("Women's indoor volleyball is an autumn sport. Men's volleyball and beach volleyball are played in spring.", "Indendørs volleyball for kvinder er en efterårssport. Herrevolleyball og beachvolley spilles om foråret."),
    divs: {
      D1: { ph: [P("reg", "08-21", "11-28", "Regular season", "Grundspil"), P("conf", "11-15", "11-28", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "12-03", "12-20", "NCAA championship, final four in San Antonio", "NCAA-mesterskab, final four i San Antonio")], aa: [A("12-17", E)],
        note: T("The latest of the fall sports in Division I: selection on 29 November, final on 20 December.", "Den efterårssport i Division I der slutter senest: udtagelse 29. november, finale 20. december.") },
      D2: { ph: [P("reg", "08-28", "11-14", "Regular season", "Grundspil", E), P("ncaa", "11-19", "12-05", "Regionals, then the finals in Kansas City", "Regionale runder og derefter finalerne i Kansas City")], aa: [A("12-17", E)] },
      D3: { ph: [P("reg", "09-01", "11-14", "Regular season", "Grundspil", E), P("ncaa", "11-19", "12-05", "Regionals, then the finals in Pittsburgh", "Regionale runder og derefter finalerne i Pittsburgh")], aa: [] },
      NAIA: { ph: [P("reg", "08-14", "11-14", "Regular season", "Grundspil"), P("ncaa", "11-21", "12-08", "Opening round, then the final site in Sioux City, IA", "Indledende runde og derefter slutrunden i Sioux City, Iowa")], aa: [A("12-15")] },
    },
    sources: [
      src(S3 + "sports/volleyball/d1/women/2026-27D1WVB_PreChampsManual.pdf", "NCAA Division I women's volleyball manual 2026-27", "NCAA: manual for Division I kvindevolleyball 2026-27"),
      src(S3 + "sports/volleyball/d3/women/2026-27D3WVB_PrechampionshipManual.pdf", "NCAA Division III women's volleyball manual 2026-27", "NCAA: manual for Division III kvindevolleyball 2026-27"),
      src("https://www.naia.org/wp-content/uploads/2026/07/WVB-Imporant-Dates-1.pdf", "NAIA women's volleyball key dates", "NAIA: vigtige datoer for kvindevolleyball"),
    ],
  },
  {
    id: "cross-country", sport: "track-and-field", name: T("Cross country", "Cross country"), season: "fall",
    note: T(
      "The first of athletics' three seasons. All-Americans are the top finishers at the national championships (the top 40 in NCAA Divisions I and II).",
      "Den første af atletikkens tre sæsoner. All-Americans er de bedst placerede ved de nationale mesterskaber (top 40 i NCAA Division I og II).",
    ),
    divs: {
      D1: { ph: [P("reg", "09-01", "10-24", "Meets", "Stævner"), P("conf", "10-25", "11-01", "Conference championships", "Conference-mesterskaber", E), P("conf", "11-13", "11-13", "NCAA regionals", "NCAA-regionsmesterskaber"), P("ncaa", "11-21", "11-21", "NCAA championships in Terre Haute, IN", "NCAA-mesterskaber i Terre Haute, Indiana")], aa: [A("11-21")] },
      D2: { ph: [P("reg", "09-03", "11-07", "Meets", "Stævner"), P("conf", "10-31", "11-08", "Conference championships", "Conference-mesterskaber", E), P("conf", "11-21", "11-21", "NCAA regionals", "NCAA-regionsmesterskaber"), P("ncaa", "12-04", "12-04", "NCAA championships in Lawrence, KS (Fall Festival)", "NCAA-mesterskaber i Lawrence, Kansas (Fall Festival)")], aa: [A("12-04")],
        note: T("Two weeks later than Divisions I and III because of the Kansas City festival.", "To uger senere end Division I og III på grund af festivalen i Kansas City.") },
      D3: { ph: [P("reg", "08-18", "11-01", "Meets", "Stævner"), P("conf", "10-25", "11-08", "Conference championships", "Conference-mesterskaber", E), P("conf", "11-14", "11-14", "NCAA regionals", "NCAA-regionsmesterskaber"), P("ncaa", "11-21", "11-21", "NCAA championships in Northfield, MN", "NCAA-mesterskaber i Northfield, Minnesota")], aa: [A("11-21", E)] },
      NAIA: { ph: [P("reg", "08-27", "11-01", "Meets", "Stævner"), P("conf", "10-25", "11-08", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "11-20", "11-20", "NAIA championships in Vancouver, WA", "NAIA-mesterskaber i Vancouver, Washington")], aa: [] },
    },
    sources: [
      src(S3 + "sports/crosstrack/d1/crosscountry/2026-27D1XCC_PrechampionshipsManual.pdf", "NCAA Division I cross country manual 2026-27", "NCAA: manual for Division I cross country 2026-27"),
      src(S3 + "sports/crosstrack/d2/crosscountry/2026-27DIIXCC_PrechampsManual.pdf", "NCAA Division II cross country manual 2026-27", "NCAA: manual for Division II cross country 2026-27"),
      src(S3 + "sports/crosstrack/d3/crosscountry/2026-27D3XCC_PreChampsManual.pdf", "NCAA Division III cross country manual 2026-27", "NCAA: manual for Division III cross country 2026-27"),
      src("https://www.naia.org/wp-content/uploads/2026/05/XC-Important-Dates.pdf", "NAIA cross country key dates", "NAIA: vigtige datoer for cross country"),
    ],
  },
  {
    id: "triathlon", sport: "triathlon", sub: WOMEN, season: "fall",
    note: T(
      "An NCAA emerging sport for women. The national championship is run by USA Triathlon, not the NCAA, and crowns Division I, II and III champions in one race.",
      "En NCAA-sport under opbygning for kvinder. Det nationale mesterskab arrangeres af USA Triathlon, ikke NCAA, og kårer mestre i Division I, II og III ved samme løb.",
    ),
    divs: same(
      { ph: [P("reg", "09-01", "11-01", "Race season", "Løbssæson", E), P("ncaa", "11-08", "11-08", "Collegiate national championship in Tempe, AZ", "Nationalt collegemesterskab i Tempe, Arizona")], aa: [A("11-20", E)] },
      none("No NAIA triathlon championship found", "Intet NAIA-mesterskab i triatlon fundet"),
    ),
    sources: [src("https://thesundevils.com/news/2026/07/7/arizona-state-to-host-2026-womens-collegiate-triathlon-national-championships", "Arizona State: 2026 women's collegiate triathlon championship", "Arizona State: collegemesterskabet i triatlon for kvinder 2026")],
  },

  // ───────────────────────────── Winter ─────────────────────────────
  {
    id: "basketball", sport: "basketball", season: "winter",
    note: T(
      "Runs across both semesters. The Division I tournament grows to 76 teams in 2027. The women's dates differ from the men's by a day or two.",
      "Løber hen over begge semestre. Turneringen i Division I udvides til 76 hold i 2027. Kvindernes datoer ligger en dag eller to fra herrernes.",
    ),
    divs: {
      D1: { ph: [P("off", "09-28", "11-01", "Preseason practice", "Træning før sæsonen", E), P("reg", "11-02", "03-07", "Regular season", "Grundspil"), P("conf", "03-01", "03-14", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "03-16", "04-05", "March Madness, men's Final Four in Detroit", "March Madness, herrernes Final Four i Detroit")], aa: [A("03-17")],
        note: T("Selection Sunday is 14 March. The women's Final Four is on 2 and 4 April in Columbus, OH.", "Selection Sunday er 14. marts. Kvindernes Final Four spilles 2. og 4. april i Columbus, Ohio.") },
      D2: { ph: [P("reg", "11-09", "02-28", "Regular season", "Grundspil"), P("conf", "02-25", "03-06", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "03-13", "03-27", "Regionals, then the Elite Eight in Fort Wayne, IN", "Regionale runder og derefter Elite Eight i Fort Wayne, Indiana")], aa: [],
        note: T("Selection is on 7 March. The women's Elite Eight is 22–26 March.", "Udtagelse 7. marts. Kvindernes Elite Eight spilles 22.–26. marts.") },
      D3: { ph: [P("reg", "11-10", "02-21", "Regular season", "Grundspil", E), P("conf", "02-20", "02-28", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "03-05", "03-21", "NCAA tournament, men's finals in Pittsburgh", "NCAA-turnering, herrernes finaler i Pittsburgh", E)], aa: [],
        note: T("Selection is on 1 March. Early-round dates are estimated from 2026; the finals (19–21 March for men, 18–20 March for women) are confirmed.", "Udtagelse 1. marts. De tidlige runder er skønnet ud fra 2026; finalerne (19.–21. marts for herrer, 18.–20. marts for kvinder) er bekræftet.") },
      NAIA: { ph: [P("reg", "10-22", "02-28", "Regular season", "Grundspil"), P("conf", "02-23", "03-02", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "03-12", "03-23", "Opening rounds, then the final site (men in Kansas City, women in Sioux City)", "Indledende runder og derefter slutrunden (herrer i Kansas City, kvinder i Sioux City)")], aa: [A("03-29")] },
    },
    sources: [
      src("https://www.ncaa.com/news/basketball-men/article/2026-08-12/2027-selection-sunday-date-schedule-tv-times-march-madness", "NCAA.com: March Madness schedule 2027", "NCAA.com: program for March Madness 2027"),
      src(S3 + "sports/basketball/d2/men/2026-27D2MBB_PreChampsManual.pdf", "NCAA Division II men's basketball manual 2026-27", "NCAA: manual for Division II herrebasketball 2026-27"),
      src(S3 + "resources/d3/2026-27D3Champ_AQMemo.pdf", "NCAA Division III selection dates 2026-27", "NCAA: udtagelsesdatoer i Division III 2026-27"),
      src("https://www.naia.org/wp-content/uploads/2026/08/2026-27-MBB-Coaches-Manual.pdf", "NAIA men's basketball coaches' manual 2026-27", "NAIA: trænermanual for herrebasketball 2026-27"),
    ],
  },
  {
    id: "ice-hockey", sport: "ice-hockey", sub: MEN, season: "winter",
    note: T("The longest regular season of the winter sports. There is no NCAA Division II championship and no NAIA hockey.", "Det længste grundspil blandt vintersportsgrenene. Der er intet NCAA-mesterskab i Division II og ingen ishockey i NAIA."),
    divs: {
      D1: { ph: [P("reg", "10-02", "03-01", "Regular season", "Grundspil"), P("conf", "03-05", "03-20", "Conference play-offs", "Conference-slutspil"), P("ncaa", "03-25", "04-10", "Regionals, then the Frozen Four in Washington, DC", "Regionale runder og derefter Frozen Four i Washington, DC")], aa: [A("04-10")],
        note: T("Selection is on 21 March.", "Udtagelse 21. marts.") },
      D2: none("No NCAA Division II championship", "Intet NCAA-mesterskab i Division II"),
      D3: { ph: [P("reg", "10-30", "02-27", "Regular season", "Grundspil", E), P("conf", "02-27", "03-07", "Conference play-offs", "Conference-slutspil", E), P("ncaa", "03-13", "03-28", "NCAA tournament", "NCAA-turnering")], aa: [A("03-26", E)] },
      NAIA: none("Not an NAIA sport", "Ikke en NAIA-sport"),
    },
    sources: [
      src("https://www.ncaa.com/news/icehockey-men/article/2026-09-30/everything-know-about-start-2026-27-di-mens-hockey-season", "NCAA.com: the 2026-27 men's hockey season", "NCAA.com: herrernes ishockeysæson 2026-27"),
      src(S3 + "sports/icehockey/d3/men/2026-27D3MIH_PrechampsManual.pdf", "NCAA Division III men's ice hockey manual 2026-27", "NCAA: manual for Division III herreishockey 2026-27"),
    ],
  },
  {
    id: "ice-hockey-women", sport: "ice-hockey", sub: WOMEN, season: "winter",
    note: T("The women's Frozen Four comes about two and a half weeks before the men's.", "Kvindernes Frozen Four spilles cirka to en halv uge før herrernes."),
    divs: {
      D1: { ph: [P("reg", "09-18", "02-28", "Regular season", "Grundspil"), P("conf", "02-27", "03-07", "Conference play-offs", "Conference-slutspil", E), P("ncaa", "03-11", "03-23", "Regionals, then the Frozen Four in Duluth, MN", "Regionale runder og derefter Frozen Four i Duluth, Minnesota")], aa: [],
        note: T("The Frozen Four dates moved to 21 and 23 March.", "Frozen Four er flyttet til 21. og 23. marts.") },
      D2: none("No NCAA Division II championship", "Intet NCAA-mesterskab i Division II"),
      D3: { ph: [P("reg", "10-30", "02-27", "Regular season", "Grundspil", E), P("conf", "02-27", "03-07", "Conference play-offs", "Conference-slutspil", E), P("ncaa", "03-13", "03-28", "NCAA tournament, finals in Plattsburgh, NY", "NCAA-turnering, finaler i Plattsburgh, New York")], aa: [] },
      NAIA: none("Not an NAIA sport", "Ikke en NAIA-sport"),
    },
    sources: [
      src("https://www.ncaa.com/news/icehockey-women/article/2026-08-31/2027-womens-frozen-four-dates-changed", "NCAA.com: 2027 women's Frozen Four dates changed", "NCAA.com: nye datoer for kvindernes Frozen Four 2027"),
      src(S3 + "sports/icehockey/d3/women/2027_D3WIH_Bracket.pdf", "NCAA Division III women's ice hockey bracket 2027", "NCAA: turneringsskema for Division III kvindeishockey 2027"),
    ],
  },
  {
    id: "swimming", sport: "swimming-and-diving", season: "winter",
    note: T(
      "Swum in yards (a 25-yard pool) during the college season. Mid-season invitationals in late November and December are where many swimmers set their qualifying times. All-Americans come from the national championships.",
      "Der svømmes i yards (25-yard-bassin) i collegesæsonen. Ved invitationsstævnerne midt i sæsonen, i slutningen af november og i december, sætter mange svømmere deres kvalifikationstider. All-Americans kåres ud fra de nationale mesterskaber.",
    ),
    divs: {
      D1: { ph: [P("reg", "10-01", "02-14", "Dual meets and invitationals", "Holdmatcher og invitationsstævner", E), P("conf", "02-15", "02-28", "Conference championships", "Conference-mesterskaber", E), P("conf", "03-08", "03-13", "Zone diving", "Zone-udspring"), P("ncaa", "03-17", "03-20", "NCAA women's championships in Austin, TX", "NCAA-mesterskaber for kvinder i Austin, Texas"), P("ncaa", "03-24", "03-27", "NCAA men's championships in Austin, TX", "NCAA-mesterskaber for herrer i Austin, Texas")], aa: [A("03-20"), A("03-27")],
        note: T("Women swim first in 2027; the order flips in 2028.", "Kvinderne svømmer først i 2027; rækkefølgen byttes om i 2028.") },
      D2: { ph: [P("reg", "09-07", "02-21", "Meets (qualifying window)", "Stævner (kvalifikationsperiode)"), P("conf", "02-10", "02-21", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "03-09", "03-13", "NCAA championships in Indianapolis", "NCAA-mesterskaber i Indianapolis")], aa: [A("03-13", E)] },
      D3: { ph: [P("reg", "10-15", "02-21", "Meets", "Stævner", E), P("conf", "02-10", "02-21", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "03-17", "03-20", "NCAA championships in Greensboro, NC", "NCAA-mesterskaber i Greensboro, North Carolina")], aa: [A("03-20", E)] },
      NAIA: { ph: [P("reg", "09-01", "02-14", "Meets", "Stævner", E), P("ncaa", "03-03", "03-06", "NAIA championships in Ypsilanti, MI", "NAIA-mesterskaber i Ypsilanti, Michigan")], aa: [] },
    },
    sources: [
      src(S3 + "sports/swimdive/d1/2026-27D1XSW_PrechampionshipManual.pdf", "NCAA Division I swimming and diving manual 2026-27", "NCAA: manual for Division I svømning og udspring 2026-27"),
      src(S3 + "sports/swimdive/d2/2026-27D2XSW_PreChampsManual.pdf", "NCAA Division II swimming and diving manual 2026-27", "NCAA: manual for Division II svømning og udspring 2026-27"),
      src(S3 + "sports/swimdive/d3/2026-27D3XSW_PreChampionshipsManual.pdf", "NCAA Division III swimming and diving manual 2026-27", "NCAA: manual for Division III svømning og udspring 2026-27"),
      src("https://www.naia.org/sports/mens-swimming-and-diving/championships", "NAIA swimming and diving championships", "NAIA: mesterskaber i svømning og udspring"),
    ],
  },
  {
    id: "indoor-track", sport: "track-and-field", name: T("Indoor athletics", "Indendørs atletik"), season: "winter",
    note: T(
      "Athletics' second season. All three NCAA divisions hold their championships on the same weekend, 12–13 March. All-Americans: the top 8 in each event make the first team, 9–16 the second team.",
      "Atletikkens anden sæson. Alle tre NCAA-divisioner holder mesterskaber samme weekend, 12.–13. marts. All-Americans: top 8 i hver disciplin kommer på førsteholdet, nr. 9–16 på andetholdet.",
    ),
    divs: {
      D1: { ph: [P("reg", "12-04", "02-21", "Meets", "Stævner"), P("conf", "02-25", "02-27", "Conference championships", "Conference-mesterskaber"), P("ncaa", "03-12", "03-13", "NCAA championships in Fayetteville, AR", "NCAA-mesterskaber i Fayetteville, Arkansas")], aa: [A("03-13")] },
      D2: { ph: [P("reg", "11-27", "02-28", "Meets (qualifying window)", "Stævner (kvalifikationsperiode)"), P("conf", "02-20", "02-28", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "03-12", "03-13", "NCAA championships in Birmingham, AL", "NCAA-mesterskaber i Birmingham, Alabama")], aa: [A("03-13")] },
      D3: { ph: [P("reg", "12-01", "03-06", "Meets (qualifying window)", "Stævner (kvalifikationsperiode)"), P("conf", "02-20", "03-06", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "03-12", "03-13", "NCAA championships in Spokane, WA", "NCAA-mesterskaber i Spokane, Washington")], aa: [A("03-13")] },
      NAIA: { ph: [P("reg", "12-01", "02-21", "Meets", "Stævner", E), P("ncaa", "03-04", "03-06", "NAIA championships in Gainesville, FL", "NAIA-mesterskaber i Gainesville, Florida")], aa: [],
        note: T("NAIA rules allow competition from 1 September.", "NAIA's regler tillader stævner fra 1. september.") },
    },
    sources: [
      src("https://www.ncaa.com/news/trackfield-indoor-women/article/2026-11-03/when-does-2027-college-indoor-track-and-field-season-start", "NCAA.com: the 2027 indoor track season", "NCAA.com: indendørssæsonen i atletik 2027"),
      src(S3 + "sports/crosstrack/d2/indoortf/2026-27D2XTI_PreChampsManual.pdf.pdf", "NCAA Division II indoor track manual 2026-27", "NCAA: manual for Division II indendørs atletik 2026-27"),
      src(S3 + "sports/crosstrack/d3/indoortf/2026-27D3XTI_PreChampsManual.pdf", "NCAA Division III indoor track manual 2026-27", "NCAA: manual for Division III indendørs atletik 2026-27"),
    ],
  },
  {
    id: "wrestling", sport: "wrestling", sub: MEN, season: "winter",
    note: T("A top-eight finish at the national championships makes a wrestler an All-American. Divisions II and III hold their championships a week before Division I.", "En top 8-placering ved de nationale mesterskaber gør en bryder til All-American. Division II og III afholder deres mesterskaber en uge før Division I."),
    divs: {
      D1: { ph: [P("reg", "11-01", "02-28", "Regular season", "Grundspil"), P("conf", "03-04", "03-07", "Conference qualifiers", "Conference-kvalifikation"), P("ncaa", "03-18", "03-20", "NCAA championships in St. Louis", "NCAA-mesterskaber i St. Louis")], aa: [A("03-20")] },
      D2: { ph: [P("reg", "11-01", "02-21", "Regular season", "Grundspil", E), P("conf", "02-27", "02-28", "Super regionals", "Super regionals"), P("ncaa", "03-12", "03-13", "NCAA championships in Cedar Rapids, IA", "NCAA-mesterskaber i Cedar Rapids, Iowa")], aa: [A("03-13", E)] },
      D3: { ph: [P("reg", "11-01", "02-21", "Regular season", "Grundspil", E), P("conf", "02-26", "02-28", "Regionals", "Regionsmesterskaber", E), P("ncaa", "03-12", "03-13", "NCAA championships in La Crosse, WI", "NCAA-mesterskaber i La Crosse, Wisconsin")], aa: [A("03-13", E)] },
      NAIA: { ph: [P("reg", "10-22", "02-20", "Regular season", "Grundspil"), P("conf", "02-14", "02-20", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "03-04", "03-06", "NAIA championships in Park City, KS", "NAIA-mesterskaber i Park City, Kansas")], aa: [A("03-06")] },
    },
    sources: [
      src(S3 + "sports/wrestling/d1/men/2026-27D1MWR_PreChampsManual.pdf", "NCAA Division I wrestling manual 2026-27", "NCAA: manual for Division I brydning 2026-27"),
      src(S3 + "sports/wrestling/d2/men/2026-27D2MWR_PrechampsManual.pdf", "NCAA Division II wrestling manual 2026-27", "NCAA: manual for Division II brydning 2026-27"),
      src("https://www.naia.org/wp-content/uploads/2026/05/2026-2027-M-Wrestling-Coaches-Manual.pdf", "NAIA men's wrestling coaches' manual 2026-27", "NAIA: trænermanual for herrebrydning 2026-27"),
    ],
  },
  {
    id: "wrestling-women", sport: "wrestling", sub: WOMEN, season: "winter",
    note: T("Women's wrestling has one NCAA championship open to all three divisions, the earliest of the wrestling championships.", "Kvindebrydning har ét NCAA-mesterskab for alle tre divisioner, og det er det tidligste af brydemesterskaberne."),
    divs: same(
      { ph: [P("reg", "11-01", "02-14", "Regular season", "Grundspil", E), P("conf", "02-19", "02-21", "Regional qualifiers", "Regionale kvalifikationsstævner"), P("ncaa", "03-05", "03-06", "NCAA championships in Coralville, IA", "NCAA-mesterskaber i Coralville, Iowa")], aa: [A("03-06", E)],
        note: T("One championship for Divisions I, II and III.", "Ét mesterskab for Division I, II og III.") },
      { ph: [P("reg", "10-22", "02-28", "Regular season", "Grundspil"), P("ncaa", "03-12", "03-13", "NAIA championships", "NAIA-mesterskaber")], aa: [A("03-13")] },
    ),
    sources: [
      src(S3 + "sports/wrestling/nc/women/2026-27NCWWR_PrechampsManual.pdf", "NCAA women's wrestling manual 2026-27", "NCAA: manual for kvindebrydning 2026-27"),
      src("https://www.naia.org/wp-content/uploads/2026/09/2026.27_WWR_Coaches_Manual_Body_Combined.pdf", "NAIA women's wrestling coaches' manual 2026-27", "NAIA: trænermanual for kvindebrydning 2026-27"),
    ],
  },
  {
    id: "gymnastics", sport: "gymnastics", sub: WOMEN, season: "winter",
    note: T("Starts in January, so it lives almost entirely in the spring semester. One NCAA championship covers all divisions.", "Starter i januar og ligger derfor næsten helt i forårssemestret. Ét NCAA-mesterskab dækker alle divisioner."),
    divs: same(
      { ph: [P("reg", "01-02", "03-14", "Regular season (scores count from 1 January)", "Grundspil (point tæller fra 1. januar)"), P("conf", "03-14", "03-20", "Conference championships", "Conference-mesterskaber", E), P("conf", "03-31", "04-04", "NCAA regionals", "NCAA-regionsmesterskaber"), P("ncaa", "04-15", "04-17", "NCAA championships in Fort Worth, TX", "NCAA-mesterskaber i Fort Worth, Texas")], aa: [A("03-30", E), A("04-17", E)],
        note: T("One championship for all NCAA divisions. Regular-season All-Americans are named at the end of March.", "Ét mesterskab for alle NCAA-divisioner. All-Americans for grundspillet udnævnes i slutningen af marts.") },
      none("No NAIA championship found", "Intet NAIA-mesterskab fundet"),
    ),
    sources: [src(S3 + "sports/gymnastics/nc/women/2026-27NCWGY_PrechampsManual.pdf", "NCAA women's gymnastics manual 2026-27", "NCAA: manual for kvindegymnastik 2026-27")],
  },

  // ───────────────────────────── Spring ─────────────────────────────
  {
    id: "tennis", sport: "tennis", season: "spring",
    note: T(
      "In Division I, tennis has two seasons. Since 2026 the NCAA singles and doubles championships are held in the autumn (moved permanently by the NCAA on 23 April 2026); spring is the team season. Division II has no NCAA individual championship, and Division III still holds singles and doubles in May.",
      "I Division I har tennis to sæsoner. Siden 2026 afgøres NCAA-mesterskaberne i single og double om efteråret (flyttet permanent af NCAA 23. april 2026), mens foråret er holdsæson. Division II har intet individuelt NCAA-mesterskab, og Division III spiller stadig single og double i maj.",
    ),
    divs: {
      D1: { ph: [P("ind", "09-19", "11-08", "ITA All-American Championships, regionals and sectionals", "ITA All-American Championships, regions- og sektionsmesterskaber"), P("ncaa", "11-17", "11-22", "NCAA singles and doubles in Athens, GA", "NCAA-mesterskaber i single og double i Athens, Georgia"), P("reg", "01-15", "04-18", "Team season (ITA Team Indoors in February)", "Holdsæson (ITA Team Indoors i februar)", E), P("conf", "04-18", "04-26", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-07", "05-23", "NCAA team championship, finals in Athens, GA (early rounds estimated)", "NCAA-holdmesterskab, finaler i Athens, Georgia (tidlige runder skønnet)")], aa: [A("05-26", E)],
        note: T("All-American status can already be earned in the autumn: reaching the last 16 in singles or the quarterfinals in doubles at the NCAA championships counts.", "All-American-status kan allerede opnås om efteråret: at nå ottendedelsfinalen i single eller kvartfinalen i double ved NCAA-mesterskaberne tæller.") },
      D2: { ph: [P("ind", "10-01", "10-18", "Autumn regionals and ITA Cup", "Regionsmesterskaber og ITA Cup om efteråret", E), P("reg", "02-01", "04-18", "Team season", "Holdsæson", E), P("conf", "04-15", "04-30", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-05", "05-23", "NCAA team championship, finals in Surprise, AZ (regionals estimated)", "NCAA-holdmesterskab, finaler i Surprise, Arizona (regionale runder skønnet)")], aa: [A("05-26", E)],
        note: T("No NCAA singles or doubles championship since 1994. The ITA Cup in October crowns small-college individual champions.", "Intet NCAA-mesterskab i single eller double siden 1994. ITA Cup i oktober kårer individuelle mestre for de mindre colleges.") },
      D3: { ph: [P("ind", "09-25", "10-18", "Autumn regionals and ITA Cup", "Regionsmesterskaber og ITA Cup om efteråret", E), P("reg", "02-01", "04-25", "Team season", "Holdsæson", E), P("conf", "04-25", "05-03", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-24", "05-31", "NCAA team, singles and doubles championships", "NCAA-mesterskaber for hold, single og double", E)], aa: [A("06-09", E)],
        note: T("Two NCAA pages give different 2027 dates and sites, so the final week is shown as an estimate.", "To NCAA-sider angiver forskellige datoer og steder for 2027, så finaleugen vises som et skøn.") },
      NAIA: { ph: [P("ind", "10-15", "10-18", "ITA Cup", "ITA Cup", E), P("reg", "02-01", "04-25", "Team season", "Holdsæson", E), P("conf", "04-20", "05-01", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-18", "05-22", "NAIA championships in Mobile, AL", "NAIA-mesterskaber i Mobile, Alabama")], aa: [A("05-27")] },
    },
    sources: [
      src("https://www.ncaa.org/news/media-center-di-mens-and-womens-singles-and-doubles-tennis-championships-moved-permanently-to-the-fall/", "NCAA: Division I singles and doubles moved permanently to the fall", "NCAA: single og double i Division I flyttet permanent til efteråret"),
      src("https://www.ncaa.org/championship/division-i/tennis/", "NCAA Division I tennis championship", "NCAA: mesterskabet i Division I tennis"),
      src("https://www.ncaa.org/championship/division-iii/tennis/", "NCAA Division III tennis championship", "NCAA: mesterskabet i Division III tennis"),
      src("https://www.naia.org/wp-content/uploads/2026/05/Tennis-Important-Dates.pdf", "NAIA tennis key dates", "NAIA: vigtige datoer for tennis"),
    ],
  },
  {
    id: "golf", sport: "golf", sub: MEN, season: "spring",
    note: T("Tournaments in both semesters, but the season builds to May. Divisions I and II play regionals; Division III and the NAIA go straight to the national championship.", "Turneringer i begge semestre, men sæsonen bygger op mod maj. Division I og II spiller regionale runder; Division III og NAIA går direkte til det nationale mesterskab."),
    divs: {
      D1: { ph: [P("ind", "09-01", "11-08", "Autumn tournaments", "Efterårsturneringer", E), P("reg", "02-01", "04-12", "Spring tournaments", "Forårsturneringer", E), P("conf", "04-15", "05-03", "Conference championships", "Conference-mesterskaber", E), P("conf", "05-17", "05-19", "NCAA regionals", "NCAA-regionsmesterskaber"), P("ncaa", "05-28", "06-02", "NCAA championships in Carlsbad, CA", "NCAA-mesterskaber i Carlsbad, Californien")], aa: [] },
      D2: { ph: [P("ind", "09-01", "11-08", "Autumn tournaments", "Efterårsturneringer", E), P("reg", "02-01", "04-12", "Spring tournaments", "Forårsturneringer", E), P("conf", "04-12", "04-26", "Conference championships", "Conference-mesterskaber", E), P("conf", "05-06", "05-08", "NCAA regionals", "NCAA-regionsmesterskaber"), P("ncaa", "05-17", "05-21", "NCAA championships in Palm Beach Gardens, FL", "NCAA-mesterskaber i Palm Beach Gardens, Florida")], aa: [] },
      D3: { ph: [P("ind", "09-01", "11-01", "Autumn tournaments", "Efterårsturneringer", E), P("reg", "02-15", "04-19", "Spring tournaments", "Forårsturneringer", E), P("conf", "04-19", "05-03", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "05-18", "05-21", "NCAA championships in Williamsburg, VA", "NCAA-mesterskaber i Williamsburg, Virginia")], aa: [] },
      NAIA: { ph: [P("ind", "09-01", "11-01", "Autumn tournaments", "Efterårsturneringer", E), P("reg", "02-01", "04-19", "Spring tournaments", "Forårsturneringer", E), P("conf", "04-19", "05-03", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "05-18", "05-21", "NAIA championships in Mesa, AZ", "NAIA-mesterskaber i Mesa, Arizona")], aa: [],
        note: T("NAIA sources disagree on whether the event ends on 21 or 23 May.", "NAIA's egne kilder er uenige om, hvorvidt mesterskabet slutter 21. eller 23. maj.") },
    },
    sources: [
      src(S3 + "sports/golf/d1/men/2023-28D1MGO_DatesSites.pdf", "NCAA Division I men's golf dates and sites 2023-28", "NCAA: datoer og spillesteder for Division I herregolf 2023-28"),
      src("https://www.ncaa.org/championship/division-i/mens-golf/", "NCAA Division I men's golf championship", "NCAA: mesterskabet i Division I herregolf"),
      src("https://www.ncaa.org/championship/division-iii/mens-golf/", "NCAA Division III men's golf championship", "NCAA: mesterskabet i Division III herregolf"),
      NAIA_DATES,
    ],
  },
  {
    id: "golf-women", sport: "golf", sub: WOMEN, season: "spring",
    note: T("Women's golf runs about a week ahead of the men's in every division.", "Kvindegolf ligger cirka en uge før herregolf i alle divisioner."),
    divs: {
      D1: { ph: [P("ind", "09-01", "11-08", "Autumn tournaments", "Efterårsturneringer", E), P("reg", "02-01", "04-05", "Spring tournaments", "Forårsturneringer", E), P("conf", "04-08", "04-26", "Conference championships", "Conference-mesterskaber", E), P("conf", "05-10", "05-12", "NCAA regionals", "NCAA-regionsmesterskaber"), P("ncaa", "05-21", "05-26", "NCAA championships in Carlsbad, CA", "NCAA-mesterskaber i Carlsbad, Californien")], aa: [],
        note: T("Selection is on 28 April.", "Udtagelse 28. april.") },
      D2: { ph: [P("ind", "09-01", "11-08", "Autumn tournaments", "Efterårsturneringer", E), P("reg", "02-01", "04-05", "Spring tournaments", "Forårsturneringer", E), P("conf", "04-08", "04-22", "Conference championships", "Conference-mesterskaber", E), P("conf", "05-03", "05-05", "NCAA regionals", "NCAA-regionsmesterskaber"), P("ncaa", "05-11", "05-15", "NCAA championships in Howey-in-the-Hills, FL", "NCAA-mesterskaber i Howey-in-the-Hills, Florida")], aa: [],
        note: T("The earliest golf final of the year.", "Årets tidligste golffinale.") },
      D3: { ph: [P("ind", "09-01", "11-01", "Autumn tournaments", "Efterårsturneringer", E), P("reg", "02-15", "04-12", "Spring tournaments", "Forårsturneringer", E), P("conf", "04-12", "04-26", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "05-11", "05-14", "NCAA championships in Williamsburg, VA", "NCAA-mesterskaber i Williamsburg, Virginia")], aa: [] },
      NAIA: { ph: [P("ind", "09-01", "11-01", "Autumn tournaments", "Efterårsturneringer", E), P("reg", "02-01", "04-26", "Spring tournaments", "Forårsturneringer", E), P("conf", "04-26", "05-10", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "05-25", "05-28", "NAIA championships (site to be confirmed)", "NAIA-mesterskaber (spillested ikke fastlagt)")], aa: [] },
    },
    sources: [
      src(S3 + "sports/golf/d1/women/Dec2025D1WGO_WGCANewsletter.pdf", "NCAA Division I women's golf newsletter (dates)", "NCAA: nyhedsbrev for Division I kvindegolf (datoer)"),
      src("https://www.ncaa.org/championship/division-i/womens-golf/", "NCAA Division I women's golf championship", "NCAA: mesterskabet i Division I kvindegolf"),
      NAIA_DATES,
    ],
  },
  {
    id: "outdoor-track", sport: "track-and-field", name: T("Outdoor athletics", "Udendørs atletik"), season: "spring",
    note: T("Athletics' third season. Only Division I has a qualifying first round and a June final; Divisions II and III and the NAIA finish in late May.", "Atletikkens tredje sæson. Kun Division I har en kvalifikationsrunde og en finale i juni; Division II og III og NAIA slutter i slutningen af maj."),
    divs: {
      D1: { ph: [P("reg", "03-14", "05-09", "Meets", "Stævner", E), P("conf", "05-10", "05-17", "Conference championships", "Conference-mesterskaber", E), P("conf", "05-26", "05-29", "NCAA first round (East and West)", "NCAA-kvalifikation (øst og vest)", E), P("ncaa", "06-09", "06-12", "NCAA championships in Eugene, OR", "NCAA-mesterskaber i Eugene, Oregon")], aa: [A("06-12", E)],
        note: T("The first-round dates are estimated from the bid rules; in 2026 it ran 27–30 May.", "Datoerne for kvalifikationen er skønnet ud fra reglerne; i 2026 blev den afviklet 27.–30. maj.") },
      D2: { ph: [P("reg", "03-07", "05-08", "Meets", "Stævner", E), P("conf", "04-24", "05-15", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "05-27", "05-29", "NCAA championships in Walnut, CA", "NCAA-mesterskaber i Walnut, Californien")], aa: [A("05-29", E)] },
      D3: { ph: [P("reg", "03-07", "05-08", "Meets", "Stævner", E), P("conf", "04-24", "05-15", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "05-27", "05-29", "NCAA championships in Geneva, OH", "NCAA-mesterskaber i Geneva, Ohio")], aa: [A("05-29", E)] },
      NAIA: { ph: [P("reg", "03-07", "05-08", "Meets", "Stævner", E), P("conf", "04-24", "05-15", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "05-26", "05-28", "NAIA championships in Asheville, NC", "NAIA-mesterskaber i Asheville, North Carolina")], aa: [] },
    },
    sources: [
      src("https://www.ncaa.org/championship/division-i/outdoor-track-and-field/", "NCAA Division I outdoor track championship", "NCAA: mesterskabet i Division I udendørs atletik"),
      src("https://www.ncaa.org/championship/division-ii/outdoor-track-and-field/", "NCAA Division II outdoor track championship", "NCAA: mesterskabet i Division II udendørs atletik"),
      src("https://www.ncaa.org/championship/division-iii/outdoor-track-and-field/", "NCAA Division III outdoor track championship", "NCAA: mesterskabet i Division III udendørs atletik"),
      NAIA_DATES,
    ],
  },
  {
    id: "rowing", sport: "rowing", sub: WOMEN, season: "spring",
    note: T(
      "Long-distance head races in the autumn, such as the Head of the Charles (16–18 October 2026); the side-by-side sprint racing that decides championships is in spring. Divisions I, II and III race at one NCAA championship. Men's rowing is not an NCAA sport; its championship, the IRA, is on 27–29 May 2027 according to the venue (not confirmed by the IRA).",
      "Lange head races om efteråret, fx Head of the Charles (16.–18. oktober 2026); sprintløbene side om side, der afgør mesterskaberne, ligger om foråret. Division I, II og III ror ved ét fælles NCAA-mesterskab. Herreroning er ikke en NCAA-sport; mesterskabet IRA afvikles 27.–29. maj 2027 ifølge arrangørstedet (ikke bekræftet af IRA).",
    ),
    divs: same(
      { ph: [P("ind", "10-01", "11-15", "Autumn head races", "Head races om efteråret", E), P("reg", "03-01", "05-09", "Spring racing", "Forårsregattaer", E), P("conf", "05-10", "05-17", "Conference championships", "Conference-mesterskaber", E), P("ncaa", "05-28", "05-30", "NCAA championships in Sarasota, FL", "NCAA-mesterskaber i Sarasota, Florida")], aa: [],
        note: T("Selection is on 18 May. One event for all three divisions.", "Udtagelse 18. maj. Ét mesterskab for alle tre divisioner.") },
      none("Not an NAIA sport", "Ikke en NAIA-sport"),
    ),
    sources: [
      src("https://www.ncaa.org/championship/division-i/rowing/", "NCAA rowing championship", "NCAA: mesterskabet i roning"),
      src("https://www.meetboston.com/events/festivals-and-special-events/head-of-the-charles/", "Head of the Charles 2026", "Head of the Charles 2026"),
    ],
  },
  {
    id: "baseball", sport: "baseball", season: "spring",
    note: T("The Division I College World Series is the last NCAA final of the year, in late June. Divisions II and III and the NAIA finish two to three weeks earlier.", "College World Series i Division I er årets sidste NCAA-finale, sidst i juni. Division II og III og NAIA slutter to-tre uger tidligere."),
    divs: {
      D1: { ph: [P("off", "09-15", "10-31", "Fall ball", "Efterårstræning og -kampe", E), P("reg", "02-19", "05-16", "Regular season (opening weekend 19–21 February)", "Grundspil (premiereweekend 19.–21. februar)", E), P("conf", "05-18", "05-30", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "06-04", "06-14", "Regionals and super regionals", "Regionals og super regionals", E), P("ncaa", "06-18", "06-28", "College World Series in Omaha", "College World Series i Omaha")], aa: [A("06-12", E)],
        note: T("Selection Monday is 31 May.", "Udtagelsen sker mandag 31. maj.") },
      D2: { ph: [P("off", "09-15", "10-31", "Fall ball", "Efterårstræning og -kampe", E), P("reg", "02-01", "05-01", "Regular season", "Grundspil", E), P("conf", "05-01", "05-12", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-21", "05-30", "Regionals and super regionals", "Regionals og super regionals", E), P("ncaa", "06-04", "06-12", "Finals in Cary, NC", "Finaler i Cary, North Carolina")], aa: [] },
      D3: { ph: [P("off", "09-15", "10-31", "Fall ball", "Efterårstræning og -kampe", E), P("reg", "02-20", "05-01", "Regular season", "Grundspil", E), P("conf", "05-01", "05-15", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-21", "05-30", "Regionals and super regionals", "Regionals og super regionals", E), P("ncaa", "06-04", "06-11", "Finals in York, PA", "Finaler i York, Pennsylvania")], aa: [A("05-29", E)] },
      NAIA: { ph: [P("off", "09-01", "10-31", "Autumn games (allowed from 1 September)", "Efterårskampe (tilladt fra 1. september)", E), P("reg", "01-28", "05-03", "Regular season", "Grundspil"), P("conf", "05-03", "05-10", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-17", "06-05", "Opening round, then the World Series in Lewiston, ID", "Indledende runde og derefter World Series i Lewiston, Idaho")], aa: [] },
    },
    sources: [
      src(S3 + "resources/d1/2026-27D1Champ_AQMemo.pdf", "NCAA Division I selection dates 2026-27", "NCAA: udtagelsesdatoer i Division I 2026-27"),
      src("https://www.ncaa.org/championship/division-i/baseball/", "NCAA Division I baseball championship", "NCAA: mesterskabet i Division I baseball"),
      src("https://www.naia.org/wp-content/uploads/2026/05/2026-2027-Baseball-Coaches-Manual-1.pdf", "NAIA baseball coaches' manual 2026-27", "NAIA: trænermanual for baseball 2026-27"),
    ],
  },
  {
    id: "softball", sport: "softball", season: "spring",
    note: T("Runs about two weeks ahead of baseball. The Women's College World Series finishes in mid-June.", "Ligger cirka to uger før baseball. Women's College World Series slutter midt i juni."),
    divs: {
      D1: { ph: [P("off", "09-15", "10-31", "Fall ball", "Efterårstræning og -kampe", E), P("reg", "02-11", "05-09", "Regular season (opening weekend 11–14 February)", "Grundspil (premiereweekend 11.–14. februar)", E), P("conf", "05-08", "05-15", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-21", "05-30", "Regionals and super regionals", "Regionals og super regionals", E), P("ncaa", "06-03", "06-11", "Women's College World Series in Oklahoma City", "Women's College World Series i Oklahoma City")], aa: [A("05-27", E)],
        note: T("Selection is on 16 May.", "Udtagelse 16. maj.") },
      D2: { ph: [P("off", "09-15", "10-31", "Fall ball", "Efterårstræning og -kampe", E), P("reg", "02-01", "05-01", "Regular season", "Grundspil", E), P("conf", "05-01", "05-10", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-20", "05-29", "Regionals and super regionals", "Regionals og super regionals", E), P("ncaa", "06-03", "06-09", "Finals in Chattanooga, TN", "Finaler i Chattanooga, Tennessee")], aa: [] },
      D3: { ph: [P("off", "09-15", "10-31", "Fall ball", "Efterårstræning og -kampe", E), P("reg", "02-20", "05-01", "Regular season", "Grundspil", E), P("conf", "05-01", "05-10", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-20", "05-29", "Regionals and super regionals", "Regionals og super regionals", E), P("ncaa", "06-03", "06-09", "Finals in Decatur, IL", "Finaler i Decatur, Illinois")], aa: [] },
      NAIA: { ph: [P("off", "09-01", "10-31", "Autumn games (allowed from 1 September)", "Efterårskampe (tilladt fra 1. september)", E), P("reg", "01-28", "05-03", "Regular season", "Grundspil"), P("conf", "05-03", "05-10", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-17", "06-02", "Opening rounds, then the World Series", "Indledende runder og derefter World Series")], aa: [A("06-01")] },
    },
    sources: [
      src("https://www.ncaa.org/championship/division-i/softball/", "NCAA Division I softball championship", "NCAA: mesterskabet i Division I softball"),
      src("https://www.naia.org/wp-content/uploads/2026/08/2026.27-Coaches-Manual-Softball-Combined.pdf", "NAIA softball coaches' manual 2026-27", "NAIA: trænermanual for softball 2026-27"),
    ],
  },
  {
    id: "lacrosse", sport: "lacrosse", season: "spring",
    note: T("All 2027 NCAA lacrosse finals are played on Memorial Day weekend: men in Philadelphia, women in Towson, MD.", "Alle NCAA-finaler i lacrosse 2027 spilles i Memorial Day-weekenden: herrerne i Philadelphia, kvinderne i Towson, Maryland."),
    divs: {
      D1: { ph: [P("off", "09-20", "10-31", "Fall ball", "Efterårstræning og -kampe", E), P("reg", "01-30", "04-24", "Regular season", "Grundspil", E), P("conf", "04-25", "05-08", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-15", "05-23", "NCAA tournament, early rounds", "NCAA-turnering, tidlige runder", E), P("ncaa", "05-28", "05-31", "Championship weekend (women 28–30 May, men 29–31 May)", "Finaleweekend (kvinder 28.–30. maj, herrer 29.–31. maj)")], aa: [A("05-21", E)],
        note: T("Selection is on 9 May.", "Udtagelse 9. maj.") },
      D2: { ph: [P("reg", "02-06", "04-24", "Regular season", "Grundspil", E), P("conf", "04-25", "05-03", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-06", "05-23", "NCAA tournament, early rounds", "NCAA-turnering, tidlige runder", E), P("ncaa", "05-29", "05-30", "Finals (women 29 May, men 30 May)", "Finaler (kvinder 29. maj, herrer 30. maj)")], aa: [] },
      D3: { ph: [P("reg", "02-20", "04-24", "Regular season", "Grundspil", E), P("conf", "04-25", "05-03", "Conference tournaments", "Conference-turneringer", E), P("ncaa", "05-06", "05-23", "NCAA tournament, early rounds", "NCAA-turnering, tidlige runder", E), P("ncaa", "05-29", "05-30", "Finals (women 29 May, men 30 May)", "Finaler (kvinder 29. maj, herrer 30. maj)")], aa: [A("05-20", E)] },
      NAIA: { ph: [P("reg", "02-01", "04-25", "Regular season", "Grundspil", E), P("ncaa", "05-10", "05-15", "NAIA championships (men 10–14 May, women 11–15 May)", "NAIA-mesterskaber (herrer 10.–14. maj, kvinder 11.–15. maj)")], aa: [] },
    },
    sources: [
      src("https://www.ncaa.org/championship/division-i/mens-lacrosse/", "NCAA Division I men's lacrosse championship", "NCAA: mesterskabet i Division I herrelacrosse"),
      src("https://www.ncaa.org/championship/division-i/womens-lacrosse/", "NCAA Division I women's lacrosse championship", "NCAA: mesterskabet i Division I kvindelacrosse"),
      NAIA_DATES,
    ],
  },
  {
    id: "volleyball-men", sport: "volleyball", sub: MEN, season: "spring",
    note: T("Men's volleyball is a spring sport. Divisions I and II share one NCAA championship; Division III has its own, which finishes first.", "Herrevolleyball er en forårssport. Division I og II deler ét NCAA-mesterskab; Division III har sit eget, som slutter først."),
    divs: (() => {
      const d12: DivData = { ph: [P("reg", "01-04", "04-25", "Regular season", "Grundspil", E), P("ncaa", "05-15", "05-17", "NCAA championship in Las Vegas", "NCAA-mesterskab i Las Vegas")], aa: [A("05-06", E)],
        note: T("One championship for Divisions I and II (selection on 2 May).", "Ét mesterskab for Division I og II (udtagelse 2. maj).") };
      return {
        D1: d12, D2: d12,
        D3: { ph: [P("reg", "01-10", "04-11", "Regular season", "Grundspil", E), P("ncaa", "04-17", "04-25", "NCAA championship, finals in Salisbury, MD (early rounds estimated)", "NCAA-mesterskab, finaler i Salisbury, Maryland (tidlige runder skønnet)")], aa: [] },
        NAIA: { ph: [P("reg", "01-14", "04-18", "Regular season", "Grundspil"), P("ncaa", "04-27", "05-01", "NAIA championships in Decatur, AL", "NAIA-mesterskaber i Decatur, Alabama")], aa: [] },
      };
    })(),
    sources: [
      src("https://www.ncaa.org/championship/national-collegiate/mens-volleyball/", "NCAA men's volleyball championship", "NCAA: mesterskabet i herrevolleyball"),
      src("https://www.ncaa.org/championship/division-iii/mens-volleyball/", "NCAA Division III men's volleyball championship", "NCAA: mesterskabet i Division III herrevolleyball"),
    ],
  },
  {
    id: "beach-volleyball", sport: "volleyball", name: T("Beach volleyball", "Beachvolley"), sub: WOMEN, season: "spring",
    note: T("One NCAA championship for all divisions, played on the beach in Gulf Shores, AL.", "Ét NCAA-mesterskab for alle divisioner, spillet på stranden i Gulf Shores, Alabama."),
    divs: same(
      { ph: [P("reg", "02-20", "04-25", "Regular season", "Grundspil", E), P("ncaa", "05-07", "05-09", "NCAA championship in Gulf Shores, AL", "NCAA-mesterskab i Gulf Shores, Alabama")], aa: [A("04-30", E)],
        note: T("One championship for all NCAA divisions.", "Ét mesterskab for alle NCAA-divisioner.") },
      { ph: [P("reg", "01-28", "04-12", "Regular season", "Grundspil"), P("ncaa", "04-22", "04-25", "NAIA championship", "NAIA-mesterskab")], aa: [] },
    ),
    sources: [src("https://www.ncaa.org/championship/national-collegiate/beach-volleyball/", "NCAA beach volleyball championship", "NCAA: mesterskabet i beachvolley")],
  },
];

// ───────────────────────────── Localisation ─────────────────────────────

export interface LocPhase { k: PhaseKind; s: number; e: number; label: string; when: string; est: boolean; startDay: string }
export interface LocMarker { p: number; when: string; est: boolean }
export interface LocDiv { none?: string; ph?: LocPhase[]; aa?: LocMarker[]; note?: string }
export interface LocSport { id: string; sport: SportKey; name: string; sub: string | null; season: SeasonKey; note: string; divs: Record<Division, LocDiv>; sources: Array<{ url: string; label: string }> }

const pick = (x: Txt, lang: string): string => (lang === "da" ? x.da : x.en);

function parts(md: string) {
  const [m, d] = md.split("-").map(Number);
  const y = m >= 8 ? SEASON.startYear : SEASON.startYear + 1;
  return { y, m, d, idx: (m - 8 + 12) % 12, days: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}
/** Position on a 0–12 month axis starting 1 August. */
export const posStart = (md: string) => { const p = parts(md); return p.idx + (p.d - 1) / p.days; };
export const posEnd = (md: string) => { const p = parts(md); return p.idx + p.d / p.days; };

function dateFmt(lang: string) {
  return new Intl.DateTimeFormat(languagePack(lang).locale, { day: "numeric", month: "short", timeZone: "UTC" });
}
/** «17 Nov» / «17. nov.» */
export function formatDay(md: string, lang: string): string {
  const p = parts(md);
  return dateFmt(lang).format(new Date(Date.UTC(p.y, p.m - 1, p.d)));
}
/** «17–22 Nov» / «17.–22. nov.»; across months «18 Dec – 25 Jan». */
export function formatRange(a: string, b: string, lang: string): string {
  if (a === b) return formatDay(a, lang);
  const A = parts(a), B = parts(b);
  if (A.m !== B.m) return `${formatDay(a, lang)} – ${formatDay(b, lang)}`;
  const fp = dateFmt(lang).formatToParts(new Date(Date.UTC(A.y, A.m - 1, A.d)));
  const i = fp.findIndex((x) => x.type === "day");
  const lit = fp[i + 1]?.type === "literal" ? fp[i + 1].value.trim() : "";
  return `${fp[i].value}${lit}–${formatDay(b, lang)}`;
}

function sportName(s: CalendarSport, lang: string): string {
  return s.name ? pick(s.name, lang) : sportLabel(s.sport, lang);
}

/** The calendar in one language, ready for the client component. */
export function localizeCalendar(lang: string): LocSport[] {
  return SPORTS.map((s) => ({
    id: s.id,
    sport: s.sport,
    name: sportName(s, lang),
    sub: s.sub ? pick(s.sub, lang) : null,
    season: s.season,
    note: pick(s.note, lang),
    sources: s.sources.map((x) => ({ url: x.url, label: pick(x.label, lang) })),
    divs: Object.fromEntries(DIVISIONS.map((d) => {
      const e = s.divs[d];
      if ("none" in e) return [d, { none: pick(e.none, lang) }];
      return [d, {
        ph: e.ph.map((p) => ({ k: p.k, s: posStart(p.a), e: posEnd(p.b), label: pick(p.label, lang), when: formatRange(p.a, p.b, lang), est: !!p.est, startDay: formatDay(p.a, lang) })),
        aa: e.aa.map((m) => ({ p: posStart(m.d) + 0.5 / 31, when: formatDay(m.d, lang), est: !!m.est })),
        note: e.note ? pick(e.note, lang) : undefined,
      }];
    })) as Record<Division, LocDiv>,
  }));
}

/** «26 Nov 2026» / «26. nov. 2026» — the date the calendar was last checked. */
export function formatUpdated(lang: string): string {
  const [y, m, d] = SEASON.updated.split("-").map(Number);
  return new Intl.DateTimeFormat(languagePack(lang).locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

// ───────────────────────────── Key dates (server-rendered tables) ─────────────────────────────

export interface KeyDateCell { when: string; venue: string | null; est: boolean; none: boolean }
export interface KeyDateRow { id: string; name: string; sub: string | null; cells: Record<Division, KeyDateCell>; source: { url: string; label: string } }

/**
 * The venue named at the end of a label: «… in Cary, NC» / «… i Cary, North
 * Carolina». A parenthetical aside is dropped first. Null when the label names none.
 */
export function venueOf(label: string, lang: string): string | null {
  const clean = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const sep = lang === "da" ? " i " : " in ";
  const i = clean.lastIndexOf(sep);
  if (i < 0) return null;
  const v = clean.slice(i + sep.length).trim();
  return /^[A-ZÆØÅ]/.test(v) ? v : null;
}

/** The last national-championship phase per division, for the key-dates tables. */
export function keyDates(lang: string): Record<SeasonKey, KeyDateRow[]> {
  const out: Record<SeasonKey, KeyDateRow[]> = { fall: [], winter: [], spring: [] };
  for (const s of SPORTS) {
    const cells = Object.fromEntries(DIVISIONS.map((d) => {
      const e = s.divs[d];
      if ("none" in e) return [d, { when: "", venue: null, est: false, none: true }];
      const fin = [...e.ph].filter((p) => p.k === "ncaa").sort((a, b) => posStart(b.a) - posStart(a.a))[0];
      if (!fin) return [d, { when: "", venue: null, est: false, none: true }];
      return [d, { when: formatRange(fin.a, fin.b, lang), venue: venueOf(pick(fin.label, lang), lang), est: !!fin.est, none: false }];
    })) as Record<Division, KeyDateCell>;
    out[s.season].push({ id: s.id, name: sportName(s, lang), sub: s.sub ? pick(s.sub, lang) : null, cells, source: { url: s.sources[0].url, label: pick(s.sources[0].label, lang) } });
  }
  return out;
}

// ───────────────────────────── FAQ ─────────────────────────────

export interface FaqItem { q: string; a: string; link: { label: string; guide: string } }

const FAQ: Array<{ q: Txt; a: Txt; label: Txt; guide: Txt }> = [
  {
    q: T("When does the college season start?", "Hvornår begynder college-sæsonen?"),
    a: T(
      "Autumn sports start in August: Division I football (soccer) from 20 August and American football from the last weekend of August. Basketball starts in early November, and the spring sports begin between late January and mid-February, when Division I baseball opens.",
      "Efterårets sportsgrene begynder i august: fodbold i Division I fra 20. august og football fra den sidste weekend i august. Basketball går i gang i begyndelsen af november, og forårets sportsgrene begynder mellem slutningen af januar og midten af februar, hvor baseball i Division I starter.",
    ),
    label: T("The NCAA season calendar explained", "Sæsonkalenderen i NCAA forklaret"),
    guide: T("season-calendar", "saeson-kalender"),
  },
  {
    q: T("When are All-Americans named?", "Hvornår udnævnes All-Americans?"),
    a: T(
      "In sports with a national championship meet, such as cross country, swimming, wrestling and athletics, All-Americans come straight from the results at that meet. In team sports the coaches' associations name them, usually just before or after the final rounds: in December for the autumn sports and in March to June for the rest.",
      "I sportsgrene med et nationalt mesterskabsstævne, som cross country, svømning, brydning og atletik, bliver All-Americans kåret direkte ud fra resultaterne ved stævnet. I holdsport udnævnes de af trænerforeningerne, som regel lige før eller efter finalerne: i december for efterårets sportsgrene og fra marts til juni for resten.",
    ),
    label: T("Glossary of college sport terms", "Ordbog over college sport-begreber"),
    guide: T("glossary", "college-sport-ordbog"),
  },
  {
    q: T("What is the difference between Divisions I, II and III?", "Hvad er forskellen på Division I, II og III?"),
    a: T(
      "Division I has the largest programmes and the most athletic scholarships, Division II offers partial scholarships, and Division III gives none at all. Each division holds its own championships, so the same sport can finish weeks apart: Division II's football (soccer), field hockey and volleyball finals, for example, all take place at one festival in Kansas City in early December.",
      "Division I har de største programmer og flest idrætslegater, Division II giver delvise legater, og Division III giver slet ingen. Hver division har sine egne mesterskaber, så samme sportsgren kan slutte med flere ugers mellemrum: Division II afvikler for eksempel finalerne i fodbold, field hockey og volleyball ved én festival i Kansas City i begyndelsen af december.",
    ),
    label: T("Divisions in the NCAA", "Divisioner i NCAA"),
    guide: T("ncaa-divisions", "ncaa-divisioner"),
  },
  {
    q: T("How is the NAIA different from the NCAA?", "Hvordan adskiller NAIA sig fra NCAA?"),
    a: T(
      "The NAIA is a separate association, mostly of smaller universities, with its own rules and championships. Its seasons often start and finish earlier: NAIA basketball can begin on 22 October, and its swimming, indoor athletics and wrestling championships are held in early March.",
      "NAIA er et selvstændigt forbund, mest for mindre universiteter, med egne regler og mesterskaber. Sæsonerne begynder og slutter ofte tidligere: Basketball i NAIA kan begynde 22. oktober, og mesterskaberne i svømning, indendørs atletik og brydning afvikles i begyndelsen af marts.",
    ),
    label: T("NCAA vs NAIA vs NJCAA", "NCAA vs NAIA vs NJCAA"),
    guide: T("ncaa-naia-njcaa", "ncaa-naia-njcaa"),
  },
];

export function faq(lang: string): FaqItem[] {
  return FAQ.map((f) => ({ q: pick(f.q, lang), a: pick(f.a, lang), link: { label: pick(f.label, lang), guide: pick(f.guide, lang) } }));
}

/** Calendar rows shown on a sport's pillar page; empty when the sport has none. */
export function calendarIdsForSport(sport: string): string[] {
  return SPORTS.filter((s) => s.sport === sport).map((s) => s.id);
}
