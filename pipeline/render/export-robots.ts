/**
 * Write robots.txt into the built static assets, so it is served WITHOUT the Worker.
 * ==================================================================================
 *
 * Runs at the end of `npm run build:worker`, after `opennextjs-cloudflare build`
 * has filled .open-next/assets/ (writing it before would be overwritten, and a
 * public/robots.txt collides with the src/app/robots.ts route in `next build`).
 * Why a static file, and when it is skipped: `staticRobotsTxt` in
 * src/lib/robots-txt.ts.
 *
 * Fail-soft like export-og-assets.ts: without the file, the Worker route answers.
 *
 * Run by hand:  npx tsx pipeline/render/export-robots.ts
 */
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { staticRobotsTxt } from "../../src/lib/robots-txt";
import { activeCountries } from "../../src/lib/countries";

const ASSETS = path.join(process.cwd(), ".open-next", "assets");
const FILE = path.join(ASSETS, "robots.txt");

try {
  if (!existsSync(ASSETS)) {
    console.warn("export-robots: .open-next/assets/ missing — robots.txt stays with the Worker");
  } else {
    const txt = staticRobotsTxt(activeCountries());
    if (txt === null) {
      rmSync(FILE, { force: true });
      console.log("export-robots: a site is dark launch — robots.txt stays per host (Worker)");
    } else {
      writeFileSync(FILE, txt);
      console.log(`export-robots: wrote ${path.relative(process.cwd(), FILE)} (static, no Worker)`);
    }
  }
} catch (e) {
  console.warn(`export-robots: ${e instanceof Error ? e.message : e} — robots.txt stays with the Worker`);
}
