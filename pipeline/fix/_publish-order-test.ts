/**
 * apply-draft-decisions publishes in the order card → article (publish-order.ts).
 * Run: npx tsx pipeline/fix/_publish-order-test.ts   (offline — stubs only)
 *
 * What must hold:
 *   - the render runs BEFORE the publish
 *   - a render that throws, reports a failed key, or finds no article still
 *     publishes, and the failure is reported (for the run's summary)
 *   - a failing publish is not swallowed
 */
import { renderThenPublish, type RenderOutcome } from "./publish-order";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

function steps(render: () => Promise<RenderOutcome>, calls: string[], publishFails = false) {
  return {
    renderCard: async () => { calls.push("render"); return render(); },
    publish: async () => {
      calls.push("publish");
      if (publishFails) throw new Error("D1 down");
    },
  };
}
const logs: string[] = [];
const log = (l: string) => logs.push(l);

async function main(): Promise<void> {
  {
    const calls: string[] = [];
    const r = await renderThenPublish(7, steps(async () => ({ failed: [], articles: 1 }), calls), log);
    ok(calls.join(",") === "render,publish", "render before publish");
    ok(r.cardError === null && logs.length === 0, "a good render reports nothing");
  }
  {
    const calls: string[] = [];
    const r = await renderThenPublish(8, steps(async () => { throw new Error("R2 put failed (500)"); }, calls), log);
    ok(calls.join(",") === "render,publish", "a render that throws still publishes");
    ok(r.cardError?.includes("R2 put failed") === true, "…and says why");
    ok(logs.some((l) => l.includes("#8") && l.includes("publishing anyway")), "…and logs it");
  }
  {
    const calls: string[] = [];
    const r = await renderThenPublish(9, steps(async () => ({ failed: ["card-9-v9"], articles: 1 }), calls), log);
    ok(calls.join(",") === "render,publish" && r.cardError?.includes("card-9-v9") === true, "a failed card key still publishes, reported");
  }
  {
    const calls: string[] = [];
    const r = await renderThenPublish(10, steps(async () => ({ failed: [], articles: 0 }), calls), log);
    ok(calls.join(",") === "render,publish" && r.cardError !== null, "a render that saw no article is reported, publish goes on");
  }
  {
    const calls: string[] = [];
    let threw = false;
    try {
      await renderThenPublish(11, steps(async () => ({ failed: [], articles: 1 }), calls, true), log);
    } catch {
      threw = true;
    }
    ok(threw && calls.join(",") === "render,publish", "a failing publish is not swallowed");
  }
  console.log(`${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main();
