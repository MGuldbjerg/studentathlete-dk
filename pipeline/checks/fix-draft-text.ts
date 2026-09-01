/**
 * Præcise tekstrettelser i UPUBLICEREDE kladder.
 *
 * Rettelserne står som data nedenfor, så de kan læses i et diff FØR de køres.
 * Hver rettelse skal matche præcis ÉN gang i kladden; gør den ikke det, springes
 * den over og siges højt. Det er spærren mod at en bred søg-og-erstat rammer et
 * andet sted i teksten end det gennemgåede.
 *
 * Rører aldrig en publiceret artikel: en rettelse dér er en RETTELSESNOTE
 * (correction_note), ikke en stille ændring af historien.
 *
 * Kør:  npx tsx pipeline/checks/fix-draft-text.ts            (viser diff)
 *       npx tsx pipeline/checks/fix-draft-text.ts --apply
 */
import { createD1Client } from "../lib/d1-client";

interface Fix {
  id: number;
  why: string;
  from: string;
  to: string;
}

/**
 * Gennemgået mod kilde og faktaark 2026-08-31.
 *
 * #199: kilden siger 4. minut (Fuenmayor) og 32. minut (Banasiks andet mål);
 *       kladden skrev 10. og 33. 27-08-2026 var en TORSDAG, ikke onsdag.
 *       «scoreless» er engelsk i en dansk tekst — husreglen er dansk med æøå.
 * #198: «de sidste 20 minutter» står hverken i kilden eller faktaarket, OG
 *       påstanden tillægges universitetets atletikafdeling. En opdigtet
 *       udtalelse lagt i munden på en navngiven institution er den værste
 *       fejlklasse vi har.
 */
const FIXES: Fix[] = [
  {
    id: 199,
    why: "kilden: Northeastern State scorede i 4. minut, ikke 10.",
    from: "bagud allerede i den 10. minut",
    to: "bagud allerede i det 4. minut",
  },
  {
    id: 199,
    why: "kilden: Banasiks andet mål faldt i 32. minut, ikke 33.",
    from: "med sit andet mål i det 33. minut",
    to: "med sit andet mål i det 32. minut",
  },
  {
    id: 199,
    why: "27. august 2026 var en torsdag",
    from: "onsdag den 27. august",
    to: "torsdag den 27. august",
  },
  {
    id: 199,
    why: "engelsk ord i dansk brødtekst",
    from: "holdt modstanderne scoreless i de sidste 45 minutter",
    to: "holdt modstanderne fra at score i de sidste 45 minutter",
  },
  {
    id: 199,
    why: "engelsk ord i dansk brødtekst",
    from: "der holdt modstanderne scoreless i anden halvleg",
    to: "der holdt modstanderne fra at score i anden halvleg",
  },
  {
    id: 198,
    why: "ukildebelagt påstand tillagt atletikafdelingen — fjernes helt",
    from: " The university’s athletics department highlights that the team’s resilience in the final 20 minutes was key to securing the win.",
    to: "",
  },
];

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();

  const ids = [...new Set(FIXES.map((f) => f.id))];
  let changed = 0;
  let skipped = 0;

  for (const id of ids) {
    const r = await db.query<{ id: number; content: string; published: number }>(
      `SELECT id, content, published FROM articles WHERE id = ?`,
      [id],
    );
    const row = (r.results ?? [])[0];
    if (!row) {
      console.log(`#${id}: findes ikke — sprunget over`);
      continue;
    }
    if (row.published !== 0) {
      console.log(`#${id}: ER PUBLICERET — røres ikke. Brug en rettelsesnote.`);
      continue;
    }

    let content = row.content ?? "";
    console.log(`\n#${id}`);
    for (const f of FIXES.filter((x) => x.id === id)) {
      const count = content.split(f.from).length - 1;
      if (count !== 1) {
        skipped++;
        console.log(`  ⊘ SPRINGES OVER (matcher ${count} gange): ${f.why}`);
        console.log(`      søgte: ${JSON.stringify(f.from.slice(0, 70))}`);
        continue;
      }
      content = content.replace(f.from, f.to);
      changed++;
      console.log(`  ✓ ${f.why}`);
      console.log(`      «${f.from.trim().slice(0, 70)}»`);
      console.log(`    → «${f.to.trim().slice(0, 70) || "(fjernet)"}»`);
    }

    if (apply && content !== row.content) {
      await db.execute(
        `UPDATE articles SET content = ?, updated_at = datetime('now') WHERE id = ? AND published = 0`,
        [content, id],
      );
      console.log(`  gemt.`);
    }
  }

  console.log(`\n${changed} rettelse(r)${apply ? " gemt" : " klar"}, ${skipped} sprunget over.`);
  if (!apply) console.log("Kør med --apply for at gemme.");
}

if (process.argv[1] && process.argv[1].endsWith("fix-draft-text.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
