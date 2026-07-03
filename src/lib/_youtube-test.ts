/**
 * Unit-tests for youtube.ts. Kør: npx tsx src/lib/_youtube-test.ts
 */
import { youtubeIdFromUrl, youtubeEmbedUrl } from "./youtube";

let passed = 0;
let failed = 0;

function expectId(text: string, want: string | null, label: string): void {
  const got = youtubeIdFromUrl(text);
  if (got === want) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}: youtubeIdFromUrl(${JSON.stringify(text)}) = ${got}, forventede ${want}`);
  }
}

// ── Skal genkendes ───────────────────────────────────────────────────────────
expectId("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ", "standard watch-URL");
expectId("https://youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ", "uden www");
expectId("https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ", "mobil-URL");
expectId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ", "med timestamp-param");
expectId("https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ", "dQw4w9WgXcQ", "v= ikke første param");
expectId("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ", "kort-URL");
expectId("https://youtu.be/dQw4w9WgXcQ?si=abc123", "dQw4w9WgXcQ", "kort-URL med share-param");
expectId("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ", "shorts");
expectId("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ", "embed-URL");
expectId("  https://youtu.be/dQw4w9WgXcQ  ", "dQw4w9WgXcQ", "whitespace trimmes");

// ── Må IKKE genkendes ────────────────────────────────────────────────────────
expectId("Se interviewet på https://youtu.be/dQw4w9WgXcQ i aften", null, "URL inde i tekst = link, ikke embed");
expectId("https://www.youtube.com/@StudentAthleteDK", null, "kanal-URL");
expectId("https://www.youtube.com/watch?v=forkort", null, "for kort ID");
expectId("https://vimeo.com/123456789", null, "vimeo");
expectId("https://studentathlete.dk/football", null, "alm. link");
expectId("", null, "tom streng");

// ── Embed-URL ────────────────────────────────────────────────────────────────
if (youtubeEmbedUrl("dQw4w9WgXcQ") === "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ") {
  passed++;
} else {
  failed++;
  console.error("  ✗ youtubeEmbedUrl bruger ikke nocookie-domænet");
}

console.log(`\nyoutube: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
