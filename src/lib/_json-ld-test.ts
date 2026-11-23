/**
 * jsonLdHtml (src/lib/json-ld.ts). Run: npx tsx src/lib/_json-ld-test.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { jsonLdHtml } from "./json-ld";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ ${name}`); }
}

const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const evil = { headline: "Win</script><script>alert(1)</script>", name: "A & B <b>", sep: `a${LS}b${PS}c` };
const out = jsonLdHtml(evil);
ok(!out.includes("<") && !out.includes(">"), "no raw < or > survives");
ok(!/<\/script/i.test(out), "a title cannot close the script element");
ok(!out.includes("&"), "no raw & survives");
ok(!out.includes(LS) && !out.includes(PS), "JS line separators are escaped");
ok(JSON.stringify(JSON.parse(out)) === JSON.stringify(evil), "the JSON parses back to exactly the same data");
ok(jsonLdHtml({ a: "Grønagergård æøå é" }) === JSON.stringify({ a: "Grønagergård æøå é" }), "ordinary text is unchanged");

// Every ld+json block in src/ goes through the helper — a new page cannot slip back to raw JSON.stringify.
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
  });
}
for (const file of walk("src")) {
  const src = readFileSync(file, "utf8");
  ok(!/__html:\s*JSON\.stringify\(/.test(src), `${file}: structured data uses jsonLdHtml, not JSON.stringify`);
}

console.log(`\njson-ld: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
