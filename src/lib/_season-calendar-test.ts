/**
 * The season calendar data (src/lib/season-calendar.ts) and its page copy.
 * Run: npx tsx src/lib/_season-calendar-test.ts
 */
import { DIVISIONS, SEASON, calendarIdsForSport, faq, formatRange, formatUpdated, keyDates, localizeCalendar, venueOf } from "./season-calendar";
import { routePath, t } from "./i18n";

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean, detail = ""): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`); }
}

for (const lang of ["da", "en"]) {
  const data = localizeCalendar(lang);
  ok(`${lang}: 24 calendar rows`, data.length === 24, String(data.length));
  for (const s of data) {
    for (const d of DIVISIONS) {
      const e = s.divs[d];
      if (e.none) continue;
      for (const p of e.ph ?? []) {
        ok(`${lang} ${s.id} ${d} «${p.label}» inside the year`, p.s >= 0 && p.e <= 12 && p.e > p.s, `${p.s}–${p.e}`);
        ok(`${lang} ${s.id} ${d} has a date text`, p.when.length > 0);
      }
    }
  }
  // Every confirmed final names its venue in the table.
  const kd = keyDates(lang);
  const rows = [...kd.fall, ...kd.winter, ...kd.spring];
  ok(`${lang}: key dates cover every row`, rows.length === 24);
  const finals = rows.flatMap((r) => DIVISIONS.map((d) => ({ r, d, c: r.cells[d] }))).filter((x) => !x.c.none);
  // A venue is missing only where there is none to give: two sites (lacrosse, NAIA
  // basketball and soccer) or a site not yet fixed (D3 men's hockey, several NAIA events).
  const venue = (id: string, d: string) => finals.find((x) => x.r.id === id && x.d === d)?.c.venue ?? null;
  ok(`${lang}: D1 soccer venue`, venue("soccer", "D1") === "Cary, NC" || venue("soccer", "D1") === "Cary, North Carolina", String(venue("soccer", "D1")));
  ok(`${lang}: D1 baseball venue`, venue("baseball", "D1") === "Omaha");
  ok(`${lang}: most finals name a venue`, finals.filter((x) => x.c.venue).length >= 75, String(finals.filter((x) => x.c.venue).length));
  ok(`${lang}: four FAQ items`, faq(lang).length === 4);
  const desc = t("cal.meta_description", lang, { season: SEASON.label });
  ok(`${lang}: meta description ≤155 chars`, desc.length <= 155, String(desc.length));
  ok(`${lang}: title carries the season, slug does not`, t("cal.title", lang, { season: SEASON.label }).includes(SEASON.label) && !routePath("calendar", lang).includes("20"));
  ok(`${lang}: slug starts with ncaa-`, routePath("calendar", lang).startsWith("/ncaa-"), routePath("calendar", lang));
}

// Language-specific details.
ok("da: Danish date range", formatRange("11-17", "11-22", "da") === "17.–22. nov.", formatRange("11-17", "11-22", "da"));
ok("en: English date range", formatRange("11-17", "11-22", "en") === "17–22 Nov", formatRange("11-17", "11-22", "en"));
ok("en: range across years", formatRange("12-18", "01-25", "en") === "18 Dec – 25 Jan", formatRange("12-18", "01-25", "en"));
ok("da: updated stamp", formatUpdated("da") === "26. nov. 2026", formatUpdated("da"));
ok("en: updated stamp", formatUpdated("en") === "26 Nov 2026", formatUpdated("en"));
ok("venue (en)", venueOf("NCAA tournament and College Cup in Cary, NC", "en") === "Cary, NC");
ok("venue (da)", venueOf("NCAA-mesterskaber i Austin, Texas", "da") === "Austin, Texas");
ok("venue ignores an aside", venueOf("NCAA team championship, finals in Athens, GA (early rounds estimated)", "en") === "Athens, GA");
ok("no venue in a plain label", venueOf("NAIA championships", "en") === null);
ok("da labels have no English", !localizeCalendar("da").some((s) => (s.divs.D1.ph ?? []).some((p) => /Regular season|tournaments?\b|championships\b|Spring|Fall /.test(p.label))));
ok("en labels have no Danish", !localizeCalendar("en").some((s) => [s.note, ...(s.divs.D1.ph ?? []).map((p) => p.label)].some((x) => /[æøå]/i.test(x))));

// Sport pages: which rows each site sport key shows.
ok("athletics shows three seasons", calendarIdsForSport("track-and-field").join() === "cross-country,indoor-track,outdoor-track");
ok("volleyball shows women, men and beach", calendarIdsForSport("volleyball").length === 3);
ok("rugby has no calendar", calendarIdsForSport("rugby").length === 0);

console.log(`\nseason calendar: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
