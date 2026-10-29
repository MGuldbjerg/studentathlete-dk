/**
 * Article lists count words in SQL instead of shipping the body
 * (`ARTICLE_LIST_SELECT`, article-list.ts). The card's reading time must not
 * drift from the article page's, which counts the body in JS (`countWords`).
 * This runs the real select against SQLite (node:sqlite, Node 22) and holds
 * the two counts together.
 * Kør: npx tsx src/lib/_word-count-sql-test.ts
 */
import { createRequire } from "node:module";
import { ARTICLE_LIST_SELECT, ARTICLE_WORD_COUNT_SQL } from "./article-list";
import { countWords, getReadingTime } from "./seo";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ ${name}`); }
}

// @types/node 20 has no node:sqlite; the runtime (Node 22) does.
interface Stmt { run(...p: unknown[]): unknown; get(...p: unknown[]): Record<string, unknown>; all(...p: unknown[]): Record<string, unknown>[] }
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (path: string) => { exec(sql: string): void; prepare(sql: string): Stmt };
};

const db = new DatabaseSync(":memory:");
db.exec(`
  CREATE TABLE athletes (id INTEGER PRIMARY KEY, name TEXT, sport TEXT, slug TEXT);
  CREATE TABLE card_blobs (key TEXT PRIMARY KEY);
  CREATE TABLE articles (
    id INTEGER PRIMARY KEY, title TEXT, slug TEXT, summary TEXT, content TEXT,
    article_type TEXT, index_words INTEGER, author TEXT, author_role TEXT,
    cover_image_url TEXT, published INTEGER, published_at TEXT, created_at TEXT,
    updated_at TEXT, athlete_id INTEGER, source_url TEXT, model_used TEXT,
    llm_provider TEXT, original_content TEXT, featured INTEGER,
    correction_note TEXT, corrected_at TEXT, fabrication_risk TEXT,
    fact_flags TEXT, story_id INTEGER, country TEXT
  );
`);

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
const cases: Record<string, string> = {
  "one word": "Hello",
  "plain sentence": "Anna Jensen won the 200 m at the conference meet.",
  "markdown paragraphs": "## Heading\n\nFirst paragraph here.\n\nSecond one, longer than the first.\n",
  "leading and trailing whitespace": "\n\n  Starts late and ends late.  \n\n",
  "CRLF line ends": "Line one\r\nLine two\r\n\r\nLine three",
  "tabs": "a\tb\t\tc",
  "a run of eight spaces": "before        after",
  "a 600-word body": words(600),
  "a 290-word body (rounding edge)": words(290).replace(/ /g, (_, i: number) => (i % 40 === 0 ? "\n\n" : " ")),
};

const insert = db.prepare(
  `INSERT INTO articles (id, title, slug, content, original_content, fact_flags, model_used, published, country)
   VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'UK')`,
);
let id = 0;
for (const [name, content] of Object.entries(cases)) insert.run(++id, name, `s${id}`, content, "x", "[]", "m");

const rows = db
  .prepare(`SELECT ${ARTICLE_LIST_SELECT} FROM articles a LEFT JOIN athletes at ON a.athlete_id = at.id ORDER BY a.id`)
  .all();

ok(rows.length === Object.keys(cases).length, "the list select runs and returns every row");
for (const banned of ["content", "original_content", "fact_flags", "model_used"]) {
  ok(!(banned in rows[0]), `the list select leaves out ${banned}`);
}

Object.values(cases).forEach((content, i) => {
  const row = rows[i];
  const name = String(row.title);
  ok(row.word_count === countWords(content), `${name}: SQL ${row.word_count} = JS ${countWords(content)}`);
  ok(getReadingTime(Number(row.word_count)) === getReadingTime(countWords(content)), `${name}: same reading time`);
});

const one = db.prepare(`SELECT ${ARTICLE_WORD_COUNT_SQL} AS n FROM articles a WHERE a.id = 1`).get();
ok(one.n === 1, "a single word is one word");

console.log(`word-count-sql: ${passed} ok, ${failed} fejl`);
if (failed > 0) process.exit(1);
