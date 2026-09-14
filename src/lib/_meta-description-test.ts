/**
 * Meta-beskrivelsen skal komme fra ARTIKLEN, ikke fra en skabelon.
 * ===========================================================================
 *
 * Målt 2026-09-14: 17 af 27 danske artikler havde ingen `summary`, og faldt
 * derfor tilbage på «Læs om {navn} på {brand}» — den samme sætning på hver af
 * dem, uden ét ord om hvad artiklen handler om. Samtidig var 55 af 67 britiske
 * manchetter LÆNGERE end de ~155 tegn Google viser, så de blev klippet midt i
 * et ord.
 *
 * Begge dele løses samme sted: manchetten hvis den findes, ellers artiklens
 * eget første afsnit — og altid klippet ved en sætning eller et ord, aldrig
 * midt i et.
 *
 * Kør: npx tsx src/lib/_meta-description-test.ts
 */
import { META_DESCRIPTION_MAX, metaDescription } from "./seo";

let passed = 0;
let failed = 0;

function check(label: string, cond: boolean, detail?: string): void {
  if (cond) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function expect(label: string, got: unknown, want: unknown): void {
  check(label, Object.is(got, want), `fik ${JSON.stringify(got)}, ville have ${JSON.stringify(want)}`);
}

// ── Manchetten vinder når den findes og er kort nok ──────────────────────────
expect(
  "kort manchet bruges uændret",
  metaDescription({ summary: "Emily Barrett scorede tre mål.", content: "Noget andet." }),
  "Emily Barrett scorede tre mål.",
);

// ── For lang manchet klippes — men aldrig midt i et ord ──────────────────────
{
  const long =
    "Ella Cashman tore the ACL in her right knee in last November's Ivy League final and was on the pitch twelve days later in the NCAA semi-final. The Princeton captain from Surbiton started both of this season's opening matches.";
  const got = metaDescription({ summary: long, content: "" })!;
  check("lang manchet klippes", got.length <= META_DESCRIPTION_MAX, `længde ${got.length}`);
  check("klippet manchet slutter ikke midt i et ord", /[.!?…]$/.test(got), got.slice(-30));
  check("klippet manchet beholder starten", got.startsWith("Ella Cashman tore the ACL"));
}

// ── Ingen manchet → artiklens eget første afsnit ─────────────────────────────
expect(
  "tom manchet → første afsnit",
  metaDescription({
    summary: null,
    content: "Mads Frederiksen scorede sit første mål for Duke.\n\n## Kampen\n\nDet stod 2-1.",
  }),
  "Mads Frederiksen scorede sit første mål for Duke.",
);

expect(
  "manchet med bare mellemrum tæller som tom",
  metaDescription({ summary: "   \n  ", content: "Første afsnit her." }),
  "Første afsnit her.",
);

// ── Overskrifter er ikke brødtekst ───────────────────────────────────────────
expect(
  "indledende overskrift springes over",
  metaDescription({
    summary: null,
    content: "## Weekendens kampe\n\nZara Mujica reddede et straffespark.",
  }),
  "Zara Mujica reddede et straffespark.",
);

// ── Markdown og HTML må ikke havne i en meta-tag ─────────────────────────────
expect(
  "fed og kursiv fjernes",
  metaDescription({ summary: null, content: "**Alex Laing** scorede _to_ gange." }),
  "Alex Laing scorede to gange.",
);

expect(
  "links reduceres til deres tekst",
  metaDescription({ summary: null, content: "Se [kampreferatet](https://example.com/x) her." }),
  "Se kampreferatet her.",
);

expect(
  "html-tags fjernes (kladde #253 skrev <br><br>)",
  metaDescription({ summary: null, content: "Første linje.<br><br>Anden linje." }),
  "Første linje. Anden linje.",
);

// ── Intet brugbart → null, så kalderen kan falde tilbage ─────────────────────
expect("tomt indhold giver null", metaDescription({ summary: null, content: "" }), null);
expect("kun en overskrift giver null", metaDescription({ summary: null, content: "## Kun en overskrift" }), null);

// ── Aldrig over grænsen, uanset kilde ────────────────────────────────────────
{
  const wall = "Ord ".repeat(200);
  for (const [label, art] of [
    ["fra manchet", { summary: wall, content: "" }],
    ["fra indhold", { summary: null, content: wall }],
  ] as const) {
    const got = metaDescription(art);
    check(`længdegrænsen holder ${label}`, (got?.length ?? 0) <= META_DESCRIPTION_MAX, `længde ${got?.length}`);
  }
}

// Et enkelt ord længere end hele grænsen må ikke give en tom streng.
{
  const got = metaDescription({ summary: "x".repeat(400), content: "" });
  check("ét meget langt ord giver stadig tekst", !!got && got.length > 0 && got.length <= META_DESCRIPTION_MAX);
}

console.log(`\nmeta-description: ${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
