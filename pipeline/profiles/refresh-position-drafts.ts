/**
 * Efterslæb: allerede GODKENDTE profiltekster med en uoversat roster-position.
 *
 * Den ugentlige baseline-kørsel rører kun atleter UDEN profile_summary
 * (build-profile-drafts.ts), så de profiler der allerede står live beholder
 * deres gamle formulering — "spiller fodbold som Midfielder" — selvom
 * positions-ordbogen nu kan skrive "som midtbanespiller".
 *
 * Dette script finder præcis dem: profiler hvor teksten indeholder skolens
 * RÅ position som selvstændigt ord, og hvor ordbogen har en bedre formulering.
 * Den nye tekst lægges i profile_draft — altså i godkendelseskøen på
 * /admin/profiler, aldrig direkte på sitet. Din nuværende tekst vises ved
 * siden af udkastet, så et håndredigeret afsnit aldrig forsvinder ved et uheld.
 *
 *   npx tsx pipeline/profiles/refresh-position-drafts.ts           # dry-run
 *   npx tsx pipeline/profiles/refresh-position-drafts.ts --apply   # læg i kø
 */
import { createD1Client } from "../lib/d1-client";
import { type BaselineAthlete } from "../../src/lib/profile-baseline";
import { profileBuilder } from "../../src/lib/i18n/profile-builders";
import { countryProfile } from "../../src/lib/countries";

import { expandPosition } from "../../src/lib/positions";
import { cleanPosition } from "../../src/lib/roster-clean";

// Sproget følger atleten (home_country), ikke kørslen — ellers får britiske
// profiler dansk tekst når scriptet køres fra det danske standardland.
function baselineFor(row: Row): string {
  return profileBuilder(countryProfile(row.home_country ?? undefined).language)(row);
}

interface Row extends BaselineAthlete {
  id: number;
  slug: string;
  home_country: string | null;
  profile_summary: string | null;
  profile_draft: string | null;
}

/** Står den rå position som selvstændigt ord i den godkendte tekst? */
function containsRawPosition(summary: string, raw: string): boolean {
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, "iu").test(summary);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();
  const r = await db.query<Row>(
    `SELECT id, slug, name, preferred_name, university, university_state, sport,
            position, hometown, year_enrolled, expected_graduation, active,
            home_country, profile_summary, profile_draft
     FROM athletes
     WHERE profile_summary IS NOT NULL AND profile_draft IS NULL`,
  );

  const stale: Array<{ row: Row; raw: string; expanded: string; draft: string }> = [];
  for (const row of r.results) {
    const raw = cleanPosition(row.position);
    if (!raw) continue;
    const lang = countryProfile(row.home_country ?? undefined).language;
    const expanded = expandPosition(row.sport, raw, lang);
    // Ordbogen kender ikke koden, eller den ændrer intet → intet at gøre.
    if (!expanded || expanded.toLowerCase() === raw.toLowerCase()) continue;
    if (!row.profile_summary || !containsRawPosition(row.profile_summary, raw)) continue;

    const draft = baselineFor(row);
    if (draft === row.profile_summary) continue;
    stale.push({ row, raw, expanded, draft });
  }

  console.log(
    `${r.results.length} godkendte profiler · ${stale.length} med uoversat position` +
      `${apply ? "" : " (DRY-RUN)"}\n`,
  );
  for (const s of stale) {
    console.log(`  #${s.row.id} ${s.row.name} — "${s.raw}" → "${s.expanded}"`);
  }

  if (!apply) {
    if (stale.length > 0) {
      console.log(
        "\nDRY-RUN: kør med --apply for at lægge dem i godkendelseskøen (/admin/profiler).",
      );
    }
    return;
  }

  for (const s of stale) {
    await db.execute(
      "UPDATE athletes SET profile_draft = ?, profile_draft_at = datetime('now') WHERE id = ?",
      [s.draft, s.row.id],
    );
  }
  console.log(`\nLagt i kø: ${stale.length} udkast → godkend på /admin/profiler`);
}

main().catch(console.error);
