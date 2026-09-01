/**
 * Kanariefugl for LLM-udbyderne.
 *
 * Baggrund (2026-08-31): NVIDIA-provideren blev sat op, testet virkende, og
 * modellen nåede end-of-life dagen efter. 14 kald i træk svarede 410, og
 * ingen opdagede det — kæden faldt bare tilbage til næste udbyder, som den
 * skal. Fallback er rigtigt for EN kørsel og forkert som permanent tilstand:
 * dommeren var væk i fem dage uden at nogen fik besked.
 *
 * Et model-id er ikke en konstant. Det er en aftale, nogen andre kan opsige.
 *
 * Kør:  npx tsx pipeline/checks/llm-health.ts
 * Exit 1 hvis en udbyder MED nøgle fejler — så et workflow kan fange det.
 */
import { MistralProvider } from "../lib/llm/provider-mistral";
import { GeminiProvider } from "../lib/llm/provider-gemini";
import { GroqProvider } from "../lib/llm/provider-groq";
import { CloudflareAIProvider } from "../lib/llm/provider-cloudflare-ai";
import { NvidiaProvider } from "../lib/llm/provider-nvidia";
import type { LLMProvider } from "../lib/llm/types";

const PROVIDERS: LLMProvider[] = [
  new MistralProvider(),
  new GeminiProvider(),
  new GroqProvider(),
  new CloudflareAIProvider(),
  new NvidiaProvider(),
];

async function main(): Promise<void> {
  let failed = 0;
  let checked = 0;

  for (const p of PROVIDERS) {
    if (!p.isAvailable()) {
      console.log(`  –  ${p.name}: ingen nøgle (springes over)`);
      continue;
    }
    checked++;
    // json:true med vilje — sådan kalder verifikatoren, og json-mode er præcis
    // dét nogle modeller ikke understøtter.
    //
    // 150 tokens, ikke 40: ræsonnerende modeller (gpt-oss) bruger tokens på at
    // tænke først, og et afkortet svar er ugyldig JSON — altså en falsk alarm.
    // Og ét forsøg mere ved fejl: 503 «temporarily overloaded» siger intet om
    // konfigurationen. En kanariefugl der fløjter ad forbigående fejl bliver
    // ignoreret — og så er den lige så værdiløs som ingen.
    let lastErr = "";
    let good = false;
    for (let attempt = 0; attempt < 2 && !good; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await p.generate({
          system: "Answer as json.",
          prompt: "Return json with key ok set to true.",
          max_tokens: 150,
          json: true,
        });
        console.log(`  ✓  ${p.name}: ${res.model} — ${(res.text ?? "").slice(0, 60).trim()}`);
        good = true;
      } catch (err) {
        lastErr = err instanceof Error ? err.message.slice(0, 150) : String(err);
      }
    }
    if (!good) {
      failed++;
      console.log(`  ✗  ${p.name}: ${lastErr}`);
    }
  }

  console.log(`\n${checked} udbyder(e) med nøgle tjekket, ${failed} fejlede.`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith("llm-health.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
