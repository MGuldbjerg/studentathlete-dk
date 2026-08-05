/**
 * Test af blokopdelingen. Sagen den blev skrevet for: en overskrift uden tom
 * linje under sig åd hele afsnittet og blev vist som et kæmpe `<h2>`.
 */
import { splitArticleBlocks } from "./article-blocks";

let passed = 0;
let failed = 0;

function eq(actual: unknown, expected: unknown, name: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    console.error(`✗ ${name}\n  fik:       ${a}\n  forventet: ${e}`);
  }
}

// 1. DEN FAKTISKE FEJL (kladde #90, Almi Nerurkar): ingen tom linje.
eq(
  splitArticleBlocks("## Season highlights\nNerurkar's season was strong.\n\n## Looking ahead\nMore text."),
  ["## Season highlights", "Nerurkar's season was strong.", "## Looking ahead", "More text."],
  "overskrift uden tom linje bliver sin egen blok",
);

// 2. Den korrekte markdown skal give præcis samme resultat.
eq(
  splitArticleBlocks("## Season highlights\n\nNerurkar's season was strong."),
  ["## Season highlights", "Nerurkar's season was strong."],
  "med tom linje: uændret opførsel",
);

// 3. Afsnit efterfulgt af overskrift uden tom linje imellem.
eq(
  splitArticleBlocks("Første afsnit.\n## Overskrift\nAndet afsnit."),
  ["Første afsnit.", "## Overskrift", "Andet afsnit."],
  "overskrift afslutter det foregående afsnit",
);

// 4. Alle tre niveauer.
eq(
  splitArticleBlocks("# En\n## To\n### Tre\nTekst"),
  ["# En", "## To", "### Tre", "Tekst"],
  "#, ## og ### står hver for sig",
);

// 5. En almindelig sætning med havelåge må IKKE blive overskrift.
eq(
  splitArticleBlocks("Hun blev nummer #3 i finalen."),
  ["Hun blev nummer #3 i finalen."],
  "havelåge midt i en sætning er ikke en overskrift",
);
eq(
  splitArticleBlocks("#hashtag uden mellemrum"),
  ["#hashtag uden mellemrum"],
  "havelåge uden mellemrum er ikke en overskrift",
);

// 6. Lister holdes samlet (renderen laver <ul>/<ol> ud fra hele blokken).
eq(
  splitArticleBlocks("- et\n- to\n- tre"),
  ["- et\n- to\n- tre"],
  "punktliste forbliver én blok",
);
eq(
  splitArticleBlocks("## Liste\n1. et\n2. to"),
  ["## Liste", "1. et\n2. to"],
  "liste direkte under en overskrift",
);

// 7. Flerlinjet citat bliver ét blockquote, men blandes ikke med brødtekst.
eq(
  splitArticleBlocks("> Første linje\n> Anden linje"),
  ["> Første linje\n> Anden linje"],
  "citatlinjer grupperes",
);
eq(
  splitArticleBlocks("Brødtekst.\n> Et citat.\nMere brødtekst."),
  ["Brødtekst.", "> Et citat.", "Mere brødtekst."],
  "citat skilles fra brødteksten omkring det",
);

// 8. Tomme linjer og mellemrum må ikke give tomme blokke.
eq(splitArticleBlocks("\n\n  \n"), [], "kun tomme linjer → ingen blokke");
eq(
  splitArticleBlocks("Tekst\n\n\n\nMere"),
  ["Tekst", "Mere"],
  "flere tomme linjer i træk deler én gang",
);

console.log(`article-blocks: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
