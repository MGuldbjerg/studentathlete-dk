/**
 * Skriv en Claude-rettelse ind i kladden — eller afvis kladden.
 * ============================================================
 *
 * Det ENESTE sted natkørslen skriver i basen. Alt andet i kæden læser.
 *
 * To handlinger, og de er bevidst adskilte fra `apply-draft-decisions.ts`, som
 * er menneskets værktøj (den kan UDGIVE; denne kan ikke, og skal ikke kunne):
 *
 *   --article N [--file svar.json]   gem rettelsen i kladden. Den bliver IKKE
 *                                    udgivet. `published` røres ikke.
 *   --reject N [--reason "..."]      afvis kladden: gem teksten i `review_log`
 *                                    og slet artiklen (samme rækkefølge som
 *                                    `deleteArticle` i src/lib/admin.ts).
 *
 * `original_content` røres ALDRIG. Den er modellens oprindelige kladde, og
 * hele målingen af om kladderne er gode nok hviler på den. Rettelsen lægges
 * OGSÅ i `claude_fixed_content` (migration 051), så strækket kan deles i to:
 * hvad maskinen rettede, og hvad Mikkel derefter stadig måtte rette.
 *
 * Ugyldigt svar gemmes IKKE — samme regel som `save-review.ts`: en manglende
 * rettelse er bedre end en falsk. Spærrerne er bevidst grove; de skal fange en
 * kørsel der er gået galt, ikke smage på redaktionen:
 *
 *   · svaret skal være gyldig JSON med `verdict` og `content`
 *   · teksten skal være ændret (ellers er der intet at gemme)
 *   · den må ikke være under 400 tegn eller over det dobbelte af kladden —
 *     en rettelse skærer og retter, den skriver ikke en ny og længere artikel
 *   · atletens efternavn skal stadig stå i teksten. En rettelse der skriver
 *     personen ud af sin egen artikel er ikke en rettelse. (#101/#102 handlede
 *     om HELT forkerte mennesker; det er den fejlklasse der koster mest.)
 *
 * Svarer modellen `"verdict": "reject"`, går den selv videre til afvisning:
 * den har læst kilden og siger at der ikke er en artikel at redde.
 */

import { readFileSync } from "node:fs";
import { createD1Client, type D1Client } from "../lib/d1-client";
import { generateSlug } from "../../src/lib/slug";
import { notify, adminLink, COLOR } from "../lib/notify";

interface FixAnswer {
  verdict?: unknown;
  title?: unknown;
  summary?: unknown;
  content?: unknown;
  note?: unknown;
  changes?: unknown;
  unfixable?: unknown;
  disagreed?: unknown;
}

interface ArticleRow {
  id: number;
  published: number;
  title: string;
  content: string;
  summary: string | null;
  country: string | null;
  article_type: string | null;
  fabrication_risk: string | null;
  original_content: string | null;
  claude_fixed_content: string | null;
  story_id: number | null;
  athlete_id: number | null;
  athlete_name: string | null;
  sensitive: string | null;
}

const ART_SELECT = `
  SELECT a.id, a.published, a.title, a.content, a.summary, a.country, a.article_type,
         a.fabrication_risk, a.original_content, a.claude_fixed_content,
         a.story_id, a.athlete_id, ath.name AS athlete_name, s.sensitive
    FROM articles a
    LEFT JOIN stories s ON s.id = a.story_id
    LEFT JOIN athletes ath ON ath.id = a.athlete_id
   WHERE a.id = ?
`;

/** Dansk slug transliterrer æ/ø/å; artiklens eget land afgør sprogpakken. */
const langForCountry = (c: string | null) => (c === "DK" ? "da" : "en");

/** Træk det første JSON-objekt ud af et svar der kan indeholde tekst og kodeblokke. */
export function extractJson(raw: string): FixAnswer | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidates = [fenced?.[1], raw];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.indexOf("{");
    const end = c.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try {
      const v = JSON.parse(c.slice(start, end + 1));
      if (v && typeof v === "object") return v as FixAnswer;
    } catch {
      // prøv næste kandidat
    }
  }
  return null;
}

const MIN_CHARS = 400;

/**
 * Er den rettede tekst brugbar? Returnerer en grund når den ikke er — grunden
 * skal i loggen, for en tavs afvisning af en rettelse ser ud som «ingen fejl».
 */
export function rejectReasonFor(
  next: { title: string; content: string },
  cur: { title: string; content: string; athlete_name: string | null },
): string | null {
  if (!next.title.trim()) return "titlen er tom";
  if (next.content.length < MIN_CHARS)
    return `teksten er ${next.content.length} tegn (under ${MIN_CHARS})`;
  if (next.content.length > cur.content.length * 2)
    return `teksten er ${next.content.length} tegn mod kladdens ${cur.content.length} — en rettelse skærer, den fordobler ikke`;
  if (next.content === cur.content && next.title === cur.title)
    return "intet er ændret";

  // Efternavnet er den billigste identitetsspærre vi har: fornavne forkortes og
  // bøjes, efternavne står som de står.
  const surname = (cur.athlete_name ?? "").trim().split(/\s+/).pop();
  if (surname && surname.length > 2 && !next.content.includes(surname))
    return `atletens efternavn «${surname}» står ikke længere i teksten`;

  return null;
}

/**
 * Hvorfor blev kladden afvist? Gennemgangens egen ordlyd, hvis den findes.
 * En generisk grund i `review_log` gør rækken ubrugelig bagefter: spørgsmålet
 * man stiller om en afvisning er altid «hvad var der galt?».
 */
async function reviewReason(db: D1Client, id: number): Promise<string> {
  const rows = await db.query<{ summary: string | null }>(
    `SELECT summary FROM draft_reviews
      WHERE article_id = ? AND reviewer = 'claude' ORDER BY id DESC LIMIT 1`,
    [id],
  );
  const s = rows.results[0]?.summary;
  return s && s.trim() ? s.trim() : "gennemgangen dømte kladden reject";
}

async function loadArticle(db: D1Client, id: number): Promise<ArticleRow | null> {
  const rows = await db.query<ArticleRow>(ART_SELECT, [id]);
  return rows.results[0] ?? null;
}

/**
 * Afvis en kladde. Rækkefølgen er ikke til forhandling: `review_log` FØRST,
 * fordi rækken skal overleve den artikel den beskriver, og børnene før
 * forælderen, fordi D1 håndhæver fremmednøglerne fra `draft_reviews` og
 * `social_posts` (se kommentaren i src/lib/admin.ts).
 *
 * `content_snapshot` får den OPRINDELIGE kladde (migration 044's kontrakt — det
 * er modellen der måles). Er kladden maskinrettet undervejs, gemmes den rettede
 * tekst i `fixed_snapshot`, så «var afvisningen rimelig?» stadig kan besvares.
 */
export async function rejectDraft(
  db: D1Client,
  row: ArticleRow,
  reason: string,
  dry: boolean,
): Promise<void> {
  console.log(`  − afviser #${row.id}: ${row.title}`);
  console.log(`    grund: ${reason}`);
  if (dry) return;

  const snapshot = row.original_content ?? row.content;
  const fixed =
    row.claude_fixed_content && row.claude_fixed_content !== snapshot
      ? row.claude_fixed_content
      : null;

  await db.execute(
    `INSERT INTO review_log (article_id, decision, article_type, fabrication_risk, sensitive,
                             content_snapshot, title_snapshot, story_id, athlete_id, fixed_snapshot)
     VALUES (?, 'rejected', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.article_type,
      row.fabrication_risk,
      row.sensitive,
      snapshot,
      row.title,
      row.story_id,
      row.athlete_id,
      fixed,
    ],
  );

  await db.batch([
    { sql: "DELETE FROM draft_reviews WHERE article_id = ?", params: [row.id] },
    { sql: "DELETE FROM social_posts WHERE article_id = ?", params: [row.id] },
    { sql: "DELETE FROM articles WHERE id = ?", params: [row.id] },
  ]);

  // En sletning er den ene handling i natkørslen der ikke kan ses i /admin
  // bagefter — kladden er væk. Derfor siges den højt.
  await notify(
    {
      title: `❌ Kladde #${row.id} afvist af natkørslen`,
      description: `**${row.title}**\n${reason}\n\nTeksten er gemt i \`review_log\` (id ${row.id}).`,
      color: COLOR.error,
      fields: [{ name: "Kø", value: adminLink(row.country ?? "DK") }],
    },
    row.country ?? undefined,
  );
}

async function applyFix(
  db: D1Client,
  row: ArticleRow,
  answer: FixAnswer,
  dry: boolean,
): Promise<boolean> {
  const verdict = String(answer.verdict ?? "");
  if (verdict === "reject") {
    const why = typeof answer.note === "string" && answer.note ? answer.note : "modellen kunne ikke rette kladden inden for reglerne";
    await rejectDraft(db, row, why, dry);
    return true;
  }
  if (verdict !== "fix") {
    console.error(`  ! #${row.id}: ukendt verdict «${verdict}» — INTET gemt`);
    return false;
  }
  if (typeof answer.content !== "string") {
    console.error(`  ! #${row.id}: svaret har ingen content — INTET gemt`);
    return false;
  }

  const content = answer.content.trim();
  const title = (typeof answer.title === "string" && answer.title.trim()) || row.title;
  const summary =
    typeof answer.summary === "string" && answer.summary.trim()
      ? answer.summary.trim()
      : row.summary;

  const bad = rejectReasonFor({ title, content }, row);
  if (bad) {
    console.error(`  ! #${row.id}: rettelsen kasseres — ${bad}`);
    return false;
  }

  const note = JSON.stringify({
    note: typeof answer.note === "string" ? answer.note : null,
    changes: Array.isArray(answer.changes) ? answer.changes : [],
    unfixable: Array.isArray(answer.unfixable) ? answer.unfixable : [],
    disagreed: Array.isArray(answer.disagreed) ? answer.disagreed : [],
    fixed_at: new Date().toISOString(),
  });

  const changes = Array.isArray(answer.changes) ? answer.changes.length : 0;
  console.log(
    `  ✓ retter #${row.id}: ${changes} rettelse(r), ${row.content.length} → ${content.length} tegn`,
  );
  if (typeof answer.note === "string" && answer.note) console.log(`    ${answer.note}`);
  if (Array.isArray(answer.unfixable) && answer.unfixable.length)
    console.log(`    kunne ikke rettes: ${answer.unfixable.join(" · ")}`);
  if (dry) return true;

  // `published` og `original_content` står med vilje ikke i sætningen. Denne
  // kørsel må ikke kunne udgive, og den må ikke kunne slette beviset.
  await db.execute(
    `UPDATE articles
        SET title = ?, slug = ?, summary = ?, content = ?,
            claude_fixed_content = ?, claude_fixed_at = datetime('now'),
            claude_fix_note = ?, updated_at = datetime('now')
      WHERE id = ? AND published = 0`,
    [
      title,
      generateSlug(title, 120, langForCountry(row.country)),
      summary,
      content,
      content,
      note,
      row.id,
    ],
  );
  return true;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dry = argv.includes("--dry-run");
  const num = (flag: string): number => {
    const i = argv.indexOf(flag);
    return i >= 0 ? parseInt(argv[i + 1] ?? "", 10) : NaN;
  };
  const str = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 ? (argv[i + 1] ?? null) : null;
  };

  const rejectId = num("--reject");
  const fixId = num("--article");
  const id = Number.isNaN(rejectId) ? fixId : rejectId;
  if (Number.isNaN(id)) {
    console.error(
      "Brug: --article <id> [--file svar.json] | --reject <id> [--reason ...] [--dry-run]",
    );
    process.exit(1);
  }

  const db = createD1Client();
  const row = await loadArticle(db, id);
  if (!row) {
    console.error(`  ! kladde #${id} findes ikke — springer over`);
    process.exit(1);
  }
  // En udgivet artikel rettes ALDRIG stille: dér er en rettelse en
  // rettelsesnote (correction_note), ikke en ændring af historien.
  if (row.published === 1) {
    console.error(`  ! #${id} er udgivet — natkørslen rører ikke udgivne artikler`);
    process.exit(1);
  }

  if (!Number.isNaN(rejectId)) {
    await rejectDraft(db, row, str("--reason") ?? (await reviewReason(db, row.id)), dry);
    return;
  }

  const file = str("--file");
  const raw = file ? readFileSync(file, "utf8") : readFileSync(0, "utf8");
  const answer = extractJson(raw);
  if (!answer) {
    console.error(`  ! #${id}: svaret er ikke JSON — INTET gemt`);
    console.error(raw.slice(0, 400));
    process.exit(1);
  }
  const ok = await applyFix(db, row, answer, dry);
  if (!ok) process.exit(1);
}

if (process.argv[1] && /apply-draft-fix\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Rettelse fejlede:", err);
    process.exit(1);
  });
}
