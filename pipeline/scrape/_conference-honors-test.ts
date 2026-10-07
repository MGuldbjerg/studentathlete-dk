/**
 * Tests for the conference-honours harvest.
 *
 * Every story in fixtures/conference-honours/ is a real release, fetched
 * 2026-10-07 and trimmed to its body. The cases that matter most are the
 * misses: a nominee is not a winner, an opponent in someone else's write-up is
 * not honoured, an academic list is not an athletic one, and a name in the
 * wrong sport or at an unknown school is somebody else.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyLabel,
  extractConferenceHonours,
  headlineAward,
  indexCandidates,
  schoolAliases,
  sportOf,
  storyLines,
  type Candidate,
  type FoundHonour,
  type StoryMeta,
} from "./conference-honors";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string) {
  if (cond) passed++;
  else { failed++; console.error(`✗ ${name}`); }
}
function eq(a: unknown, b: unknown, name: string) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x === y) passed++;
  else { failed++; console.error(`✗ ${name}\n    got:      ${x}\n    expected: ${y}`); }
}

const FX = join(__dirname, "fixtures", "conference-honours");
const lines = (f: string) => storyLines(readFileSync(join(FX, `${f}.html`), "utf8"));

let nextId = 1;
function cand(name: string, school: string, common: string, sport: string, gender: string | null, inConference = true): Candidate {
  return { id: nextId++, name, sport, gender, schoolAliases: schoolAliases(school, common), inConference };
}

function run(file: string, meta: Omit<StoryMeta, "url">, cands: Candidate[]): FoundHonour[] {
  return extractConferenceHonours({ ...meta, url: `https://example.test/${file}` }, lines(file), indexCandidates(cands));
}
const about = (found: FoundHonour[], c: Candidate) =>
  found.filter((f) => f.athleteId === c.id).map((f) => `${f.award_name}@${f.occurred_on}`);

// ── Labels ───────────────────────────────────────────────────────────────────
eq(classifyLabel("Honor Roll"), { award_name: "Honor Roll", kind: "award", significance: "notable" }, "honour roll counts (Mikkel, 2026-10-07)");
eq(classifyLabel("Commissioner's Honor Roll"), "block", "the commissioner's honour roll is academic");
eq(classifyLabel("Academic All-Ivy"), "block", "academic all-conference is out (Mikkel, 2026-10-06)");
eq(classifyLabel("Other Nominees"), "block", "nominees are not winners");
eq(classifyLabel("Coach of the Year"), "block", "a coach's award blocks");
eq((classifyLabel("SSC OFFENSIVE PLAYER OF THE WEEK") as { award_name: string }).award_name, "Player of the Week", "upper-case weekly label");
eq((classifyLabel("Men's Golfer of the Week") as { award_name: string }).award_name, "Player of the Week", "golfer of the week is a weekly award");
eq((classifyLabel("Runner of the Year") as { award_name: string }).award_name, "Player of the Year", "runner of the year");
eq((classifyLabel("All-MEC First Team") as { award_name: string }).award_name, "All-Conference", "All-<any conference> on a conference site");
eq((classifyLabel("All-American Conference Second Team") as { award_name: string }).award_name, "All-Conference", "the American Conference's team is not All-America");
eq((classifyLabel("ITA All-America Honors") as { award_name: string }).award_name, "All-American", "national All-America");
eq(classifyLabel("All-Time Leaders"), null, "All-Time is not a team");
eq(headlineAward("2025-26 Lightweight Men's Rowing All-Ivy, Coaching Staff of the Year Announced") !== "skip", true, "a coaching award beside a team does not skip the story");
eq(headlineAward("Preseason All-ACC Team Announced"), "skip", "a forecast is skipped");

eq(sportOf("WOMEN’S SOCCER"), { sport: "soccer", gender: "f" }, "sport heading with a curly apostrophe");
eq(sportOf("Men's Cross Country"), { sport: "track-and-field", gender: "m" }, "cross country is track and field");
eq(sportOf("FIELD HOCKEY"), { sport: "field-hockey", gender: null }, "field hockey, not track and field");

// ── Ivy League weekly roundup: labels, honour roll, sport sections ───────────
{
  const baileff = cand("Issy Baileff", "Yale University", "Yale", "field-hockey", "f");
  const thomson = cand("Riley Thomson", "University of Pennsylvania", "Penn", "field-hockey", "f");
  const wrongSport = cand("Kirsten Smith", "Brown University", "Brown", "soccer", "f");
  const found = run("ivy_roundup", { headline: "Ivy League Athletes of the Week - Aug. 31 - Sept. 7", date: "2026-09-08", category: "Field Hockey" }, [baileff, thomson, wrongSport]);
  eq(about(found, baileff), ["Player of the Week@2026-09-08"], "co-defensive player of the week");
  eq(about(found, thomson), ["Honor Roll@2026-09-08"], "honour-roll item in a semicolon list");
  eq(about(found, wrongSport), [], "same name in another sport is someone else");
}

// ── SSC: winner vs nominee, cumulative list with its own dates ───────────────
{
  const rigg = cand("Alex Rigg", "Lynn University", "Lynn", "soccer", "f");
  const roane = cand("Stella Roane", "Embry-Riddle Aeronautical University", "Embry-Riddle", "soccer", "f");
  const gallo = cand("Jasmine Gallo", "Eckerd College", "Eckerd", "soccer", "f");
  const found = run("ssc_pow_gallo", { headline: "Rigg, Roane Earn SSC Women’s Soccer Player of the Week Honors", date: "2026-09-15", category: "Women's Soccer" }, [rigg, roane, gallo]);
  eq(about(found, rigg), ["Player of the Week@2026-09-15"], "the winner");
  eq(about(found, roane), ["Player of the Week@2026-09-15"], "the defensive winner");
  eq(about(found, gallo), [], "a nominee gets nothing");
}
{
  const rigg = cand("Alex Rigg", "Lynn University", "Lynn", "soccer", "f");
  const found = run("ssc_cumulative", { headline: "Brualokken, Winn Named SSC Women's Soccer Players of the Week", date: "2026-09-29", category: "Women's Soccer" }, [rigg]);
  eq(about(found, rigg), ["Player of the Week@2026-09-15"], "a cumulative list dates each week by its own line");
}

// ── MEC: "9/15: Name, School" list, year taken from the story ────────────────
{
  const phillips = cand("Charlie Phillips", "Davis & Elkins College", "Davis & Elkins", "soccer", "m");
  const scandalis = cand("Travis Scandalis", "West Liberty University", "West Liberty", "soccer", "m");
  const found = run("mec_cumulative", { headline: "Concord Sweeps MEC Men's Soccer Weekly Awards", date: "2025-10-20", category: "Men's Soccer" }, [phillips, scandalis]);
  eq(about(found, phillips), ["Player of the Week@2025-10-13"], "dated entry");
  eq(about(found, scandalis), ["Player of the Week@2025-09-15"], "earlier week in the same list");
}

// ── G-MAC roundup: sport headings, "Name / School / …" entries ────────────────
{
  const houghton = cand("Isaac Houghton", "Tiffin University", "Tiffin", "track-and-field", "m");
  const found = run("gmac_aow", { headline: "Great Midwest Athletes of the Week (Oct. 5)", date: "2026-10-05", category: "General" }, [houghton]);
  eq(about(found, houghton), ["Player of the Week@2026-10-05"], "entry line counts; the narrative after it does not add a second");
}

// ── Season teams ─────────────────────────────────────────────────────────────
{
  const giller = cand("Christian Giller", "Florida Southern College", "Florida Southern", "track-and-field", "m");
  const scarangelli = cand("Nick Scarangelli", "Embry-Riddle Aeronautical University", "Embry-Riddle", "track-and-field", "m");
  const found = run("ssc_allconf", { headline: "2025 Men's Cross Country All-SSC Selections", date: "2025-10-28", category: "Men's Cross Country" }, [giller, scarangelli]);
  eq(about(found, giller), ["All-Conference@2025-10-28"], "first-team cell after a coach-of-the-year line");
  ok(about(found, scarangelli).includes("Player of the Year@2025-10-28"), "runner of the year, inline label");
}
{
  const forbes = cand("Alex Forbes", "Harvard University", "Harvard", "rowing", "m");
  const found = run("ivy_rowing_allivy", { headline: "Lightweight Men's Rowing All-Ivy, Coaching Staff of the Year Announced", date: "2026-05-19", category: "Lightweight Rowing" }, [forbes]);
  eq(about(found, forbes), ["All-Conference@2026-05-19"], "first team All-Ivy — and nothing from the academic paragraph");
}
{
  const hewitt = cand("Hugo Hewitt", "University of Charleston", "Charleston", "track-and-field", "m");
  const found = run("mec_allregion", { headline: "USTFCCCA Announces Outdoor All-Region Teams", date: "2025-05-17", category: "Men's Outdoor Track & Field" }, [hewitt]);
  eq(about(found, hewitt), ["All-Region@2025-05-17"], "\"Name: event\" entries under a school heading");
}
{
  const pow = cand("Luca Pow", "Wake Forest University", "Wake Forest", "tennis", "m");
  const found = run("acc_ita_aa", { headline: "Eight Individuals, Six Doubles Teams Earn ITA All-America Honors", date: "2025-05-27", category: "Men's Tennis" }, [pow]);
  eq(about(found, pow), ["All-American@2025-05-27"], "second name in a doubles pair");
}

// ── Narrative: only with the surname in the headline ─────────────────────────
{
  const barrett = cand("Emily Barrett", "Tiffin University", "Tiffin", "tennis", "f");
  const found = run("gmac_aa", { headline: "Barrett, Choi become first-ever TU women's tennis All Americans", date: "2025-06-04", category: "Women's Tennis" }, [barrett]);
  eq(about(found, barrett), ["All-American@2025-06-04"], "headline surname + sentence naming athlete and award");
}
{
  const prat = cand("Antonio Prat", "University of Miami", "Miami", "tennis", "m");
  const found = run("acc_tennis_pow", { headline: "ACC Announces Men’s Tennis Players of the Week", date: "2025-04-08", category: "Men's Tennis" }, [prat]);
  eq(about(found, prat), [], "an opponent in someone else's write-up is not honoured");
}

// ── Lists without the school on the line ─────────────────────────────────────
{
  const mills = cand("Lena Mills", "Duke University", "Duke", "rowing", "f");
  const found = run("acc_crew", { headline: "Duke’s Varsity Eight Earns ACC Crew of the Week", date: "2026-03-17", category: "Rowing" }, [mills]);
  eq(about(found, mills), ["Crew of the Week@2026-03-17"], "boat member, school in the conference");
  const outsider = cand("Lena Mills", "Some Other University", "Other", "rowing", "f", false);
  const found2 = run("acc_crew", { headline: "Duke’s Varsity Eight Earns ACC Crew of the Week", date: "2026-03-17", category: "Rowing" }, [outsider]);
  eq(about(found2, outsider), [], "same name, school neither on the line nor in the conference");
}
{
  const foley = cand("Connor Foley", "Brown University", "Brown", "lacrosse", "m");
  const found = run("ivy_lax_narr", { headline: "Ivy League Men's Lacrosse Weekly Awards Announced", date: "2025-02-24", category: "Men's Lacrosse" }, [foley]);
  ok(about(found, foley).includes("Player of the Week@2025-02-24"), "\"Feb. 24 - Name, School (…)\" entry");
}

// ── Backfill findings, 2026-10-07 ────────────────────────────────────────────
{
  // A season table repeated in every weekly release, the date in its own cell.
  // Read with the release's date, Jemma Cave got 13 Players of the Week for one.
  const cave = cand("Jemma Cave", "Stephen F. Austin State University", "SFA", "tennis", "f");
  const found = run("slc_table", { headline: "Garcia Baquero Named Jersey Mike's SLC Tennis Players of the Week", date: "2025-03-11", category: "Women's Tennis" }, [cave]);
  eq(about(found, cave), ["Player of the Week@2025-01-28"], "a date alone in a table cell dates the names below it");
}
{
  const manufor = cand("Samuel Manufor", "University of North Carolina at Charlotte", "Charlotte", "soccer", "m");
  const found = run("amer_honors", { headline: "American Conference Announces 2025 Men’s Soccer Honors", date: "2025-11-05", category: "Men's Soccer" }, [manufor]);
  const got = about(found, manufor);
  ok(got.includes("Freshman of the Year@2025-11-05"), "Freshman of the Year keeps its own name, not Player of the Year");
  ok(!got.includes("Player of the Year@2025-11-05"), "…and is not also Player of the Year");
  ok(got.includes("All-Conference@2025-11-05"), "\"First Team All-Conference\" is read as All-Conference, not a bare tier");
  ok(got.includes("All-Freshman@2025-11-05"), "All-Freshman Team");
}
eq((classifyLabel("Freshman of the Year") as { award_name: string }).award_name, "Freshman of the Year", "freshman of the year label");
eq((classifyLabel("Newcomer of the Year") as { award_name: string }).award_name, "Freshman of the Year", "newcomer of the year is the same tier");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
