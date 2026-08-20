/**
 * Bygger kontekstpakken til Claude Desktop.
 *
 * Mikkel vil kunne lægge ÉN fil i et Claude Desktop-projekt og have hele
 * konteksten med. Desktop har hverken repo, database eller site, så alt der
 * ellers ville blive slået op undervejs, skal stå i filen.
 *
 * Prosaen ligger i `desktop-pakke/_brief-skabelon.md` med {{PLACEHOLDERE}}, så
 * teksten kan rettes uden at røre kode. Tallene hentes her — sportsnøglerne fra
 * koden og resten fra D1 — netop for at pakken ikke kan stå og lyve om en
 * taksonomi eller en kladdekø, der har ændret sig.
 *
 * Kør: npx tsx pipeline/report/build-desktop-pack.ts
 *      (kræver CLOUDFLARE_API_TOKEN, _ACCOUNT_ID, _D1_DATABASE_ID)
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createD1Client } from "../lib/d1-client";
import { SPORT_KEYS } from "../../src/lib/sports";
import { sportLabel, sportSlug } from "../../src/lib/i18n";

const SKABELON = "desktop-pakke/_brief-skabelon.md";
const UDDATA = "desktop-pakke/StudentAthlete-til-Claude-Desktop.md";

/** Dokumenter i repoet, som Desktop kan bede Mikkel om at indsætte. */
const DOKUMENTER: Array<[string, string]> = [
  ["CLAUDE.md", "Retningslinjer for Claude Code i repoet: sprog, stack, scraping-regler"],
  ["projekt-status.md", "Løbende status — læses FØRST ved nyt arbejde. Lang."],
  ["ARKITEKTUR-motor.md", "De tre lag (kerne/sprog/land) og de fem regler"],
  ["PLAYBOOK-nyt-land.md", "Bindende rækkefølge når et nyt land skal lanceres"],
  ["ARTICLE-ACCURACY.md", "Diagnosen af hvorfor modellerne opfinder, og planen imod det"],
  ["DESIGN.md", "Designsystem: farver, typografi, komponenter, artikel-templates"],
  ["EDITORIAL-PLAN.md", "Alt skal kunne redigeres fra /admin (code-default + D1-override)"],
  ["PROMPT.md", "Ralph-loopets instruks til artikelgenerering"],
  ["SETUP-cloudflare-access.md", "Adgangsstyring til /admin"],
  ["UDKAST-persondata-dk.md", "Persondata-vurdering, dansk"],
  ["UDKAST-persondata-uk.md", "Persondata-vurdering, britisk"],
  ["UDKAST-LIA-interesseafvejning.md", "Interesseafvejningen bag behandlingen"],
];

function tabel(rækker: string[][], hoveder: string[]): string {
  const linjer = [`| ${hoveder.join(" | ")} |`, `|${hoveder.map(() => "---").join("|")}|`];
  for (const r of rækker) linjer.push(`| ${r.join(" | ")} |`);
  return linjer.join("\n");
}

async function main(): Promise<void> {
  const db = createD1Client();

  // ── Sportsgrene: fra koden, ikke fra hukommelsen ──────────────────────────
  const sportstabel = tabel(
    SPORT_KEYS.map((k) => [
      `\`${k}\``,
      sportLabel(k, "da"),
      `/${sportSlug(k, "da")}`,
      sportLabel(k, "en"),
      `/${sportSlug(k, "en")}`,
    ]),
    ["Nøgle (database)", "Dansk navn", "DK-URL", "Engelsk navn", "UK-URL"],
  );

  // ── Tabeller med rækkeantal ───────────────────────────────────────────────
  const navne = await db.query<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_cf%' ESCAPE '\\' ORDER BY name`,
  );
  const tælleRækker: string[][] = [];
  for (const { name } of navne.results) {
    const r = await db.query<{ n: number }>(`SELECT COUNT(*) n FROM "${name}"`);
    tælleRækker.push([`\`${name}\``, String(r.results[0]?.n ?? "?")]);
  }
  const tabeller = tabel(tælleRækker, ["Tabel", "Rækker"]);

  // ── Kladdekøen ────────────────────────────────────────────────────────────
  const kladder = await db.query<{ id: number; title: string; country: string | null; verdict: string | null }>(
    `SELECT a.id, a.title, a.country,
            (SELECT d.verdict FROM draft_reviews d WHERE d.article_id = a.id ORDER BY d.id DESC LIMIT 1) AS verdict
       FROM articles a WHERE a.published = 0 ORDER BY a.id`,
  );
  const kladdetabel = kladder.results.length
    ? tabel(
        kladder.results.map((k) => [`#${k.id}`, k.country ?? "?", k.verdict ?? "(ikke gennemgået)", k.title]),
        ["Kladde", "Land", "Seneste verdict", "Titel"],
      )
    : "_Køen er tom._";

  // ── Atleter pr. sport og land ─────────────────────────────────────────────
  const atleter = await db.query<{ sport: string; home_country: string | null; n: number }>(
    `SELECT sport, home_country, COUNT(*) n FROM athletes GROUP BY sport, home_country ORDER BY n DESC`,
  );
  const pr = new Map<string, { dk: number; uk: number; andet: number }>();
  for (const r of atleter.results) {
    const e = pr.get(r.sport) ?? { dk: 0, uk: 0, andet: 0 };
    if (r.home_country === "DK") e.dk += r.n;
    else if (r.home_country === "UK") e.uk += r.n;
    else e.andet += r.n;
    pr.set(r.sport, e);
  }
  const atlettabel = tabel(
    [...pr.entries()]
      .sort((a, b) => b[1].dk + b[1].uk + b[1].andet - (a[1].dk + a[1].uk + a[1].andet))
      .map(([sport, e]) => [
        `\`${sport}\``,
        String(e.dk),
        String(e.uk),
        String(e.andet),
        String(e.dk + e.uk + e.andet),
      ]),
    ["Sport", "DK", "UK", "Andet/ukendt", "I alt"],
  );

  // ── Status: forsiden af projekt-status.md ─────────────────────────────────
  const status = readFileSync("projekt-status.md", "utf8").split("\n");
  const sidstOpdateret = status.find((l) => l.startsWith("**Sidst opdateret**")) ?? "";
  const overskrifter = status.filter((l) => l.startsWith("## ")).slice(0, 12);
  const statusblok = [
    sidstOpdateret,
    "",
    "De nyeste afsnit i `projekt-status.md` (bed Mikkel om filen, hvis et af dem er relevant):",
    "",
    ...overskrifter.map((h) => `- ${h.replace(/^##\s*/, "")}`),
  ].join("\n");

  // ── Saml ──────────────────────────────────────────────────────────────────
  let sha = "ukendt commit";
  try {
    sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    // Ikke et git-repo eller intet git — pakken virker fint uden.
  }
  const stempel = `${new Date().toISOString().slice(0, 16).replace("T", " ")} (commit ${sha})`;

  const ud = readFileSync(SKABELON, "utf8")
    .replace("{{GENERERET}}", stempel)
    .replace("{{SPORT_ANTAL}}", String(SPORT_KEYS.length))
    .replace("{{SPORTSTABEL}}", sportstabel)
    .replace("{{TABELLER}}", tabeller)
    .replace("{{KLADDER}}", kladdetabel)
    .replace("{{ATLETTAL}}", atlettabel)
    .replace("{{STATUS}}", statusblok)
    .replace("{{DOKUMENTER}}", tabel(DOKUMENTER.map(([f, h]) => [`\`${f}\``, h]), ["Fil", "Indhold"]));

  const rest = ud.match(/\{\{[A-Z_]+\}\}/g);
  if (rest) throw new Error(`Uerstattede pladsholdere: ${rest.join(", ")}`);

  writeFileSync(UDDATA, ud);
  console.log(`Skrev ${UDDATA} (${ud.split("\n").length} linjer, ${SPORT_KEYS.length} sportsgrene, ${kladder.results.length} kladder).`);
}

main().catch((err) => {
  console.error("Kunne ikke bygge desktop-pakken:", err);
  process.exit(1);
});
