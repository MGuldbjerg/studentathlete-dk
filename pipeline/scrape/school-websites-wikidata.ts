/**
 * Skolernes hovedside fra Wikidata.
 * =================================
 *
 * Hele NJCAA-tieren stod uden `website` — 442 junior colleges — og uden en
 * hovedside kan hverken `find-athletics-site` eller `scrape-rosters` gøre
 * noget: begge starter med `WHERE s.website IS NOT NULL`.
 *
 * NJCAA's eget medlemskatalog svarer 403 bag CloudFront, så den vej er
 * lukket. Wikidata har derimod `P856` (official website) for stort set alle
 * amerikanske colleges, svarer på én forespørgsel for 50 skoler ad gangen, og
 * inviterer eksplicit til maskinlæsning.
 *
 * NØJAGTIGT navnematch, med vilje. Wikidata indeholder også gymnasier,
 * hospitaler og bygninger med lignende navne; en fuzzy match ville skrive en
 * fremmed institutions adresse ind, og derfra ville roster-scraperen hente
 * fremmede atleter. Rammer vi ikke, står feltet tomt — det er det rigtige
 * svar, ikke et tab.
 *
 * Kør:
 *   npx tsx pipeline/scrape/school-websites-wikidata.ts --division NJCAA [--limit 500] [--dry-run]
 */

import { createD1Client } from "../lib/d1-client";
import { divisionPattern } from "../lib/divisions";
import { pipelineUserAgent } from "../../src/lib/site";

const ENDPOINT = "https://query.wikidata.org/sparql";
const BATCH = 50;

interface SchoolRow {
  id: number;
  name: string;
}

/** Én SPARQL-forespørgsel for op til `BATCH` skoler. Label → website. */
export function buildQuery(names: string[]): string {
  // Anførselstegn og backslash ville bryde ud af strengen i SPARQL.
  const values = names
    .map((n) => `"${n.replace(/\\/g, "").replace(/"/g, "")}"@en`)
    .join(" ");
  return `SELECT ?label ?site WHERE { VALUES ?label { ${values} } ?item rdfs:label ?label ; wdt:P856 ?site . }`;
}

async function lookup(names: string[]): Promise<Map<string, string>> {
  const url = `${ENDPOINT}?query=${encodeURIComponent(buildQuery(names))}`;
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": pipelineUserAgent() },
  });
  if (!res.ok) throw new Error(`Wikidata svarede ${res.status}`);
  const data = (await res.json()) as {
    results: { bindings: { label: { value: string }; site: { value: string } }[] };
  };
  const out = new Map<string, string>();
  for (const b of data.results.bindings) {
    // Første svar vinder: nogle institutioner har flere P856-værdier.
    if (!out.has(b.label.value)) out.set(b.label.value, b.site.value);
  }
  return out;
}

/** Kun rigtige http(s)-adresser, uden efterstillet skråstreg. */
export function cleanUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const division = argv[argv.indexOf("--division") + 1] ?? null;
  const limitArg = parseInt(argv[argv.indexOf("--limit") + 1] ?? "", 10);
  const limit = Number.isNaN(limitArg) ? 500 : limitArg;

  const db = createD1Client();
  const { results } = await db.query<SchoolRow>(
    `SELECT id, name FROM schools
      WHERE website IS NULL AND division LIKE ?
      ORDER BY id LIMIT ?`,
    [divisionPattern(argv.includes("--division") ? division : null), limit],
  );

  console.log(`${results.length} skole(r) uden hovedside${dryRun ? " [dry-run]" : ""}\n`);
  let found = 0;

  for (let i = 0; i < results.length; i += BATCH) {
    const chunk = results.slice(i, i + BATCH);
    const hits = await lookup(chunk.map((s) => s.name));
    for (const school of chunk) {
      const url = cleanUrl(hits.get(school.name) ?? "");
      if (!url) continue;
      found++;
      console.log(`  ✓ ${school.name} → ${url}`);
      if (!dryRun) {
        await db.execute("UPDATE schools SET website = ? WHERE id = ? AND website IS NULL", [
          url,
          school.id,
        ]);
      }
    }
    // Wikidata beder om skånsom brug; en pause pr. batch er billig for os.
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\n${found} af ${results.length} fik en hovedside${dryRun ? " [intet gemt]" : ""}.`);
}

if (process.argv[1] && /school-websites-wikidata\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
