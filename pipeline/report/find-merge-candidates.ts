/**
 * Fylder dublet-køen (merge_candidates) med par som reglerne IKKE kan afgøre.
 *
 * Sikre dubletter (fælles spiller-id fra bio_url) flettes automatisk af
 * scraperen og dedup-athletes.ts. Tilbage står de usikre: samme skole, samme
 * sport, delvist samme navn — fx to rækker hvor skolen ændrede efternavnet OG
 * ingen af dem har et numerisk spiller-id i bio_url'en (~45% af atleterne).
 * Dem gætter vi ikke på; de går i kø til godkendelse i /admin/dubletter.
 *
 * Rapporterer desuden navne der ligner ASCII-foldet dansk (Bogebjerg →
 * Bøgebjerg): US-rosters stripper æ/ø/å, og rettelsen er redaktionel, ikke
 * regelbaseret — derfor kun en liste at gå igennem i /admin/atleter/{id}.
 *
 *   npx tsx pipeline/report/find-merge-candidates.ts           # dry-run
 *   npx tsx pipeline/report/find-merge-candidates.ts --apply   # skriv til køen
 */
import { createD1Client } from "../lib/d1-client";
import { mergeCandidate, type CandidateRow } from "../lib/athlete-identity";

interface Row extends CandidateRow {
  id: number;
  slug: string;
  active: number;
}

/**
 * Stammer hvor den danske original næsten altid har æ/ø/å. Bevidst kort og
 * konservativ: listen skal give få, rigtige forslag — ikke fange alt.
 */
const FOLDED_STEMS = [
  "moller", "moeller", "norgaard", "noergaard", "sorensen", "soerensen",
  "jorgensen", "joergensen", "ostergaard", "oestergaard", "sondergaard",
  "soendergaard", "kjaer", "bogebjerg", "boegebjerg", "gaard", "bjorn",
  "holmstrom", "blaesdahl", "jaeger", "ambaek", "moldrup", "moeldrup",
  "voller", "vollmer", "brondby", "lovendal", "loevendal", "dahlgard",
];

/** Ligner navnet en ASCII-foldet dansk stavemåde? Rådgivende — aldrig automatisk. */
function looksAsciiFolded(name: string): boolean {
  if (/[æøåÆØÅ]/.test(name)) return false; // allerede rettet
  const n = name.toLowerCase();
  if (FOLDED_STEMS.some((s) => n.includes(s))) return true;
  // ae/oe/aa midt i et efternavn er næsten altid æ/ø/å der er blevet foldet.
  return /(ae|oe|aa)/.test(n.split(/\s+/).slice(1).join(" "));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();
  const r = await db.query<Row>(
    `SELECT id, name, roster_name, slug, sport, position, hometown, university,
            bio_url, class_year, active
     FROM athletes WHERE active = 1`,
  );

  // Kun par inden for samme skole+sport kan være kandidater — det holder
  // krydset lille og støjen nede.
  const buckets = new Map<string, Row[]>();
  for (const row of r.results) {
    const key = `${row.university}::${row.sport}`;
    const arr = buckets.get(key) ?? [];
    arr.push(row);
    buckets.set(key, arr);
  }

  const found: Array<{ keep: Row; merge: Row; score: number; reasons: string[] }> = [];
  for (const rows of buckets.values()) {
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const s = mergeCandidate(rows[i], rows[j]);
        if (!s) continue;
        // Keeper-forslag: den med flest udfyldte felter (kan ændres i UI'en).
        const filled = (x: Row) => [x.hometown, x.position, x.bio_url, x.class_year]
          .filter(Boolean).length;
        const [keep, merge] = filled(rows[i]) >= filled(rows[j])
          ? [rows[i], rows[j]] : [rows[j], rows[i]];
        found.push({ keep, merge, score: s.score, reasons: s.reasons });
      }
    }
  }

  console.log(
    `${r.results.length} aktive atleter · ${found.length} mulig(e) dublet(ter)` +
      `${apply ? "" : " (DRY-RUN)"}\n`,
  );
  for (const f of found) {
    console.log(`  #${f.keep.id} "${f.keep.name}" ⟷ #${f.merge.id} "${f.merge.name}"`);
    console.log(`     ${f.keep.university} · score ${f.score} · ${f.reasons.join(", ")}`);
  }

  if (apply) {
    for (const f of found) {
      await db.execute(
        `INSERT OR IGNORE INTO merge_candidates
         (athlete_id_keep, athlete_id_merge, score, reason)
         VALUES (?, ?, ?, ?)`,
        [f.keep.id, f.merge.id, f.score, f.reasons.join(", ")],
      );
    }
    console.log(`\nSkrevet til køen: ${found.length} → /admin/dubletter`);
  } else if (found.length > 0) {
    console.log("\nDRY-RUN: kør med --apply for at lægge dem i køen (/admin/dubletter).");
  }

  const suspects = r.results.filter((x) => looksAsciiFolded(x.name));
  if (suspects.length > 0) {
    console.log(
      `\n── Mulige ASCII-foldede danske navne (${suspects.length}) ─────────────────`,
    );
    console.log("Rettes i hånden på /admin/atleter/{id} — skolens stavemåde bevares\n" +
      "i roster_name, så scraperen stadig genkender atleten.\n");
    for (const s of suspects) {
      console.log(`  #${s.id.toString().padEnd(4)} ${s.name.padEnd(30)} ${s.university}`);
    }
  }
}

main().catch(console.error);
