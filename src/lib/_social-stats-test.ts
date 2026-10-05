/**
 * Unit tests for the dashboard's trend/follower/funnel helpers.
 * Run: npx tsx src/lib/_social-stats-test.ts
 */
import {
  buildFunnel,
  daysBetween,
  followerSummary,
  isSocialReferrer,
  toDailySeries,
  toFollowerSeries,
} from "./social-stats";

let failed = 0;
function eq(a: unknown, b: unknown, msg: string) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    console.error(`FAIL: ${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
    failed++;
  }
}

// daysBetween: inclusive, across a month boundary, empty when reversed.
eq(daysBetween("2026-09-29", "2026-10-02"), ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"], "days across months");
eq(daysBetween("2026-10-02", "2026-10-02"), ["2026-10-02"], "one day");
eq(daysBetween("2026-10-03", "2026-10-02"), [], "reversed range is empty");
eq(daysBetween("2000-01-01", "2099-01-01").length, 1000, "absurd range is capped");

// Page views: a quiet day is a zero, not a gap.
const trend = toDailySeries(
  [
    { day: "2026-10-01", site: "DK", value: 5 },
    { day: "2026-10-03", site: "DK", value: 2 },
    { day: "2026-10-02", site: "UK", value: 9 },
    { day: "2026-10-02", site: "?", value: 4 },
  ],
  "site",
  ["DK", "UK"],
  "2026-10-01",
  "2026-10-03",
);
eq(trend.map((s) => s.key), ["DK", "UK"], "one series per site, in the given order");
eq(trend[0].points.map((p) => p.value), [5, 0, 2], "DK fills the quiet day with 0");
eq(trend[1].points.map((p) => p.value), [0, 9, 0], "UK too");
eq(trend.some((s) => s.key === "?"), false, "unknown-site rows are not a series");

// Followers: a day without a measurement is unknown, NOT zero.
const fs = toFollowerSeries([
  { channel: "bluesky_uk", day: "2026-10-03", followers: 12 },
  { channel: "bluesky_uk", day: "2026-10-01", followers: 10 },
  { channel: "bluesky", day: "2026-10-01", followers: 3 },
]);
eq(fs.map((s) => s.key), ["bluesky", "bluesky_uk"], "sorted by channel");
eq(fs[1].points.map((p) => p.day), ["2026-10-01", "2026-10-03"], "no invented day in between");
eq(followerSummary(fs[1]), { first: 10, last: 12, change: 2 }, "change over the range");
eq(followerSummary({ key: "x", points: [] }), { first: 0, last: 0, change: 0 }, "empty series");

// Funnel: posts joined with visits; bio-link and campaign sources stay out.
const funnel = buildFunnel(
  [{ channel: "bluesky_uk", posts: 20 }, { channel: "instagram_uk", posts: 4 }],
  [{ source: "bluesky_uk", visits: 6 }, { source: "threads_uk", visits: 3 }, { source: "ig", visits: 30 }],
  ["bluesky", "bluesky_uk", "instagram_uk", "threads_uk"],
);
eq(funnel.map((r) => r.channel), ["bluesky_uk", "threads_uk", "instagram_uk"], "sorted by visits; silent channels left out");
eq(funnel[0].perPost, 0.3, "visits per post, one decimal");
eq(funnel[1], { channel: "threads_uk", posts: 0, visits: 3, perPost: null }, "visits without posts in range → no ratio");
eq(funnel.some((r) => r.channel === "ig"), false, "the bio-link source is not a channel");

eq(isSocialReferrer("l.instagram.com"), true, "instagram link shim");
eq(isSocialReferrer("m.facebook.com"), true, "mobile facebook");
eq(isSocialReferrer("bsky.app"), true, "bluesky");
eq(isSocialReferrer("www.google.com"), false, "search is not social");
eq(isSocialReferrer("notfacebook.com"), false, "suffix must be a real subdomain");

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log("All social-stats tests passed.");
