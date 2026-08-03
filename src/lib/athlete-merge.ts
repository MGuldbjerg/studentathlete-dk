/**
 * Fletning af to atlet-rækker der viste sig at være samme person.
 *
 * Rent SQL-bygger uden DB-afhængighed, fordi fletningen har TO kaldere med hver
 * sin klient: pipeline/report/dedup-athletes.ts (D1 REST) og /admin/dubletter
 * (Workers-binding). Havde de hver sin kopi af sekvensen, ville de drive fra
 * hinanden — og en halv fletning efterlader forældreløse artikler.
 *
 * Rækkefølgen er vigtig: flyt referencer FØR taber-rækken slettes.
 */

/** Felterne der kan arves fra taberen når keeperen mangler dem. */
export interface MergeableAthlete {
  id: number;
  slug: string;
  name: string;
  roster_name?: string | null;
  roster_key?: string | null;
  hometown?: string | null;
  position?: string | null;
  bio_url?: string | null;
  photo_url?: string | null;
  photo_credit?: string | null;
  class_year?: string | null;
  expected_graduation?: number | null;
  year_enrolled?: number | null;
  profile_summary?: string | null;
}

export interface MergeStatement {
  sql: string;
  params: (string | number | null)[];
}

/**
 * "Denmark" uden by er en pladsholder, ikke en oplysning. Uden dette ville
 * COALESCE-reglen ("overskriv aldrig et udfyldt felt") holde fast i keeperens
 * "Denmark" og smide taberens "Horsens, Denmark" væk ved fletningen.
 */
function isBareCountry(hometown: string | null | undefined): boolean {
  if (!hometown) return true;
  const h = hometown.trim().toLowerCase().replace(/\.$/, "");
  return h === "" || h === "denmark" || h === "danmark";
}

/** Tabeller der peger på en atlet. UNIQUE-indeks kræver OR IGNORE + oprydning. */
const REFERENCE_TABLES: Array<{ table: string; unique: boolean }> = [
  { table: "articles", unique: false },
  { table: "stories", unique: false },
  { table: "sources", unique: false },
  // UNIQUE(athlete_id, award_name, season) — en begivenhed keeperen allerede
  // har, kan ikke flyttes; den skal droppes i stedet for at vælte fletningen.
  { table: "athlete_events", unique: true },
  // UNIQUE(athlete_id, image_url)
  { table: "photo_suggestions", unique: true },
];

/**
 * Byg hele fletningen: taberens referencer og manglende felter overføres til
 * keeperen, taberens slug bliver alias (301), og taber-rækken slettes.
 */
export function buildMergeStatements(
  keep: MergeableAthlete,
  loser: MergeableAthlete,
): MergeStatement[] {
  if (keep.id === loser.id) return [];
  const out: MergeStatement[] = [];

  for (const { table, unique } of REFERENCE_TABLES) {
    out.push({
      sql: `UPDATE ${unique ? "OR IGNORE " : ""}${table} SET athlete_id = ? WHERE athlete_id = ?`,
      params: [keep.id, loser.id],
    });
    if (unique) {
      // Resten er dubletter af noget keeperen allerede har.
      out.push({
        sql: `DELETE FROM ${table} WHERE athlete_id = ?`,
        params: [loser.id],
      });
    }
  }

  // Keeperen arver KUN felter den selv mangler — en udfyldt værdi på keeperen
  // (fx et verificeret dansk hometown) overskrives aldrig. Eneste undtagelse:
  // en rigtig by slår et bart "Denmark".
  const hometownUpgrade =
    isBareCountry(keep.hometown) && !isBareCountry(loser.hometown)
      ? (loser.hometown ?? null)
      : null;
  out.push({
    sql: `UPDATE athletes SET
            roster_name = COALESCE(roster_name, ?),
            roster_key = COALESCE(roster_key, ?),
            hometown = COALESCE(?, hometown, ?),
            position = COALESCE(position, ?),
            bio_url = COALESCE(bio_url, ?),
            photo_url = COALESCE(photo_url, ?),
            photo_credit = COALESCE(photo_credit, ?),
            class_year = COALESCE(class_year, ?),
            expected_graduation = COALESCE(expected_graduation, ?),
            year_enrolled = COALESCE(year_enrolled, ?),
            profile_summary = COALESCE(profile_summary, ?),
            updated_at = datetime('now')
          WHERE id = ?`,
    params: [
      loser.roster_name ?? null,
      loser.roster_key ?? null,
      hometownUpgrade,
      loser.hometown ?? null,
      loser.position ?? null,
      loser.bio_url ?? null,
      loser.photo_url ?? null,
      loser.photo_credit ?? null,
      loser.class_year ?? null,
      loser.expected_graduation ?? null,
      loser.year_enrolled ?? null,
      loser.profile_summary ?? null,
      keep.id,
    ],
  });

  // Taberens slug lever videre som 301 — den kan være delt, linket eller indekseret.
  out.push({
    sql: `INSERT OR IGNORE INTO athlete_aliases (athlete_id, slug, name, reason)
          VALUES (?, ?, ?, 'merge')`,
    params: [keep.id, loser.slug, loser.name],
  });
  // Taberens egne gamle aliasser skal pege på keeperen.
  out.push({
    sql: "UPDATE OR IGNORE athlete_aliases SET athlete_id = ? WHERE athlete_id = ?",
    params: [keep.id, loser.id],
  });
  out.push({
    sql: "DELETE FROM athlete_aliases WHERE athlete_id = ?",
    params: [loser.id],
  });
  // Et alias må aldrig have samme slug som en levende atlet → redirect-løkke.
  out.push({
    sql: "DELETE FROM athlete_aliases WHERE slug = ?",
    params: [keep.slug],
  });

  // Køen har FREMMEDNØGLER til athletes(id) (migration 032). Rækker der peger på
  // taberen SKAL væk FØR atleten slettes — ellers fejler slettningen med
  // "FOREIGN KEY constraint failed", og fletningen dør halvvejs igennem.
  // Det slog ikke fejl i pipeline-scriptet, fordi den første fletning skete før
  // køen overhovedet havde rækker.
  //
  // Vi sletter i stedet for at markere 'merged': taberen findes ikke mere, så
  // forslaget kan hverken vises eller genbesøges. Sporet ligger i
  // athlete_aliases-rækken (reason='merge' + taberens navn og dato).
  // Forslag der involverer KEEPEREN og en tredje atlet står urørt.
  out.push({
    sql: "DELETE FROM merge_candidates WHERE athlete_id_keep = ? OR athlete_id_merge = ?",
    params: [loser.id, loser.id],
  });

  out.push({ sql: "DELETE FROM athletes WHERE id = ?", params: [loser.id] });

  return out;
}
