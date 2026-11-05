/**
 * The article hero (src/lib/article-photo.ts) and migration 085.
 * Run: npx tsx src/lib/_article-photo-test.ts
 */
import { readFileSync } from "node:fs";
import { articleHero, articlePostPhoto } from "./article-photo";
import { buildPostText } from "../../pipeline/social/copy";
import { photoCreditText } from "./photo-credit";
import { getArticleCoverUrl } from "./seo";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ ${name}`); }
}

const base = { id: 1038, card_ready: 0 };
const photo = {
  ...base,
  photo_url: "https://media.studentathlete.dk/photos/article-1038.webp",
  photo_photographer: "Matteo Bracco",
  photo_school: "Hofstra University",
  photo_source_url: "https://gohofstra.com/news/2026/9/13/womens-soccer-hofstra-drops-2-1-decision-to-brown.aspx",
  photo_school_permission: "granted",
  photo_school_common_name: "Hofstra",
};

// ── No photo → the generated card, no credit ──────────────────────────────────
const card = articleHero(base);
ok(card.src === getArticleCoverUrl(base), "no photo: the card");
ok(card.credit === null, "no photo: no credit line");

// ── A photo from a school that allows it ─────────────────────────────────────
const hero = articleHero(photo);
ok(hero.src === photo.photo_url, "photo shown");
const line = photoCreditText({ ...hero.credit!, lang: "en" });
ok(line.includes("Matteo Bracco"), `photographer credited (${line})`);
ok(line.includes("Hofstra Athletics"), "school credited by its short name");
ok(!line.includes("Hofstra University Athletics"), "not by the official name");
ok(hero.credit!.sourceUrl === photo.photo_source_url, "source article linked");

// NULL (never asked) and asked are allowed, as for athlete photos.
ok(articleHero({ ...photo, photo_school_permission: null }).credit !== null, "never-asked school: allowed");

// ── The gate ─────────────────────────────────────────────────────────────────
for (const p of ["declined", "do_not_contact", "do-not-contact", " Declined "]) {
  const h = articleHero({ ...photo, photo_school_permission: p });
  ok(h.src === getArticleCoverUrl(base) && h.credit === null, `${p.trim()}: back to the card`);
}
ok(articleHero({ ...photo, photo_school: null }).credit === null, "no rights holder: never shown");
ok(articleHero({ ...photo, photo_url: "javascript:alert(1)" }).credit === null, "non-http URL refused");

// ── Migration 085 is additive (scripts/migrate-live.sh) ──────────────────────
const sql = readFileSync(new URL("../../db/migration-085-article-photo.sql", import.meta.url), "utf-8")
  .split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
ok(statements.length === 4 && statements.every((s) => /^ALTER TABLE articles ADD COLUMN/i.test(s)), "migration only adds columns");

// ── Social posts ─────────────────────────────────────────────────────────────
const graphic = { ...photo, photo_url: "https://media.studentathlete.dk/photos/article-1038.jpg", photo_photographer: null,
  photo_source_url: "https://gohofstra.com/news/2026/11/4/womens-soccer-four-named-to-all-caa-teams.aspx" };
const post = articlePostPhoto(graphic, "en", true);
ok(post?.imageUrl === graphic.photo_url, "post carries the school's image");
ok(post?.credit === "Photo: Hofstra Athletics", `post credit, no Source label (${post?.credit})`);
ok(articlePostPhoto(photo, "en", true) === null, "webp photo skipped for Instagram (JPEG only)");
ok(articlePostPhoto(photo, "en", false) !== null, "webp photo fine for other channels");
ok(articlePostPhoto({ ...graphic, photo_school_permission: "declined" }, "en", false) === null, "declined: card in posts too");
ok(articlePostPhoto(base, "en", false) === null, "no photo: card");

const input = { title: "Amy Meadows and Sasha McTiffin named to All-CAA Second Team", description: "d ".repeat(400),
  url: "https://student-athlete.co.uk/x", lang: "en", sport: "soccer", country: "UK", photoCredit: "Photo: Hofstra Athletics" };
for (const pf of ["bluesky", "facebook", "instagram", "threads"] as const) {
  const text = buildPostText(input, pf);
  ok(text.includes("Photo: Hofstra Athletics"), `${pf}: credit in the text`);
  const max = { bluesky: 300, facebook: 2000, instagram: 2200, threads: 500 }[pf];
  ok([...text].length <= max, `${pf}: within ${max} characters (${[...text].length})`);
}
ok(!buildPostText({ ...input, photoCredit: null }, "bluesky").includes("Photo:"), "no photo: no credit line");

console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
