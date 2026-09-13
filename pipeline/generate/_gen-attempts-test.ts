/**
 * Unit-tests for generations-forsøgstælleren.
 * Kør: npx tsx pipeline/generate/_gen-attempts-test.ts
 */
import { MAX_GEN_ATTEMPTS, generationExhausted } from "./generate-articles";

let passed = 0;
let failed = 0;

function check(cond: boolean, label: string): void {
  if (cond) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

check(!generationExhausted(1), "ét afbrudt svar er ikke en dom — prøv igen");
check(!generationExhausted(2), "to er stadig ikke en dom");
check(generationExhausted(MAX_GEN_ATTEMPTS), "det tredje forsøg står ved magt");
check(generationExhausted(MAX_GEN_ATTEMPTS + 1), "forbi grænsen bliver den stående");
check(generationExhausted(99), "langt forbi grænsen er stadig endeligt");
check(!generationExhausted(0), "nul forsøg er ikke opbrugt");
check(generationExhausted(2, 2), "grænsen kan sænkes");
check(!generationExhausted(2, 5), "grænsen kan hæves");
check(MAX_GEN_ATTEMPTS === 3, "grænsen er tre, som for faktaarkene");

console.log(`\ngen-attempts: ${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
