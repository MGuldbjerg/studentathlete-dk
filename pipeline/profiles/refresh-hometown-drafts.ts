/**
 * Efterslæb: GODKENDTE profiltekster der staver hjembyen som skolen gjorde.
 *
 * Amerikanske rosters skriver "Copenhagen" eller "Vaerloese"; landeprofilens
 * `cityAliases` kender nu de rigtige navne, men teksterne der allerede står
 * live blev skrevet før tabellen fandtes. Dette script finder dem.
 *
 * Rettelsen er KIRURGISK: kun bynavnet i den eksisterende, godkendte tekst
 * skiftes ud — resten står præcis som du godkendte den, så en håndredigeret
 * formulering ikke forsvinder (det ville en fuld regenerering ellers gøre,
 * jf. refresh-position-drafts.ts). Teksten lægges i profile_draft, altså i
 * godkendelseskøen på /admin/profiler, aldrig direkte på sitet.
 *
 *   npx tsx pipeline/profiles/refresh-hometown-drafts.ts           # dry-run
 *   npx tsx pipeline/profiles/refresh-hometown-drafts.ts --apply   # læg i kø
 */
import { createD1Client } from "../lib/d1-client";
import { countryProfile } from "../../src/lib/countries";

interface Row {
  id: number;
  name: string;
  home_country: string | null;
  hometown: string | null;
  profile_summary: string;
}

/**
 * Erstat kendte roster-stavemåder med det lokale bynavn — kun som HELE ord, så
 * et bynavn inde i et længere egennavn ikke rammes tilfældigt. Unicode-bevidst
 * ordgrænse (\b duer ikke: den brydes af ø/æ/å).
 */
export function localizeCityNames(text: string, aliases: Record<string, string>): string {
  let out = text;
  for (const [alias, canonical] of Object.entries(aliases)) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(
      new RegExp(`(^|[^\\p{L}])(${escaped})([^\\p{L}]|$)`, "giu"),
      (_m, before: string, _hit: string, after: string) => `${before}${canonical}${after}`,
    );
  }
  return out;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();
  const r = await db.query<Row>(
    `SELECT id, name, home_country, hometown, profile_summary
     FROM athletes
     WHERE profile_summary IS NOT NULL AND profile_draft IS NULL`,
  );

  const stale: Array<{ row: Row; draft: string }> = [];
  for (const row of r.results ?? []) {
    const aliases = countryProfile(row.home_country ?? undefined).cityAliases;
    if (!aliases) continue;
    const draft = localizeCityNames(row.profile_summary, aliases);
    if (draft !== row.profile_summary) stale.push({ row, draft });
  }

  console.log(
    `${(r.results ?? []).length} godkendte profiler · ${stale.length} med skolens bystavemåde` +
      `${apply ? "" : " (DRY-RUN)"}\n`,
  );
  for (const s of stale) {
    console.log(`  #${s.row.id} ${s.row.name}`);
    console.log(`     før:  ${s.row.profile_summary}`);
    console.log(`     nu:   ${s.draft}\n`);
  }

  if (!apply) {
    if (stale.length > 0) {
      console.log("DRY-RUN: kør med --apply for at lægge dem i godkendelseskøen (/admin/profiler).");
    }
    return;
  }

  for (const s of stale) {
    await db.execute(
      "UPDATE athletes SET profile_draft = ?, profile_draft_at = datetime('now') WHERE id = ?",
      [s.draft, s.row.id],
    );
  }
  console.log(`Lagt i kø: ${stale.length} udkast → godkend på /admin/profiler`);
}

if (process.argv[1]?.includes("refresh-hometown-drafts")) {
  main().catch(console.error);
}
