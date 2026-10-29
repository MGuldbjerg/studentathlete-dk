/**
 * Render the card, THEN publish — the order apply-draft-decisions.ts keeps.
 * ========================================================================
 *
 * Mikkel 2026-10-29: «Render the article when published.» The page links its
 * share card (and with cards in R2 links the bucket object directly), and the
 * social queue only posts an article whose card is stored. Rendering before
 * `published = 1` means the article is never live, in a list, an og:image or a
 * queue, without its card.
 *
 * A failed render must not hold the article back: it is published anyway, the
 * page's cover falls back to /api/og (which draws the card), the social queue
 * waits for the card, and the hourly render-cards.yml (and social-post.yml's
 * own render step) retry it. The failure is logged and counted for the run's
 * summary. Kept apart from the script so the order can be tested with stubs.
 */

export interface RenderOutcome {
  /** Card keys that failed to render or store. */
  failed: string[];
  /** Articles the render query matched; 0 means it never saw the article. */
  articles: number;
}

export interface PublishSteps {
  renderCard(): Promise<RenderOutcome>;
  publish(): Promise<void>;
}

/** Render first, publish always. Returns why the card is missing, or null. */
export async function renderThenPublish(
  id: number,
  steps: PublishSteps,
  log: (line: string) => void = console.log,
): Promise<{ cardError: string | null }> {
  let cardError: string | null = null;
  try {
    const r = await steps.renderCard();
    if (r.failed.length) cardError = `failed: ${r.failed.join(", ")}`;
    else if (r.articles === 0) cardError = "the render found no such article";
  } catch (err) {
    cardError = err instanceof Error ? err.message : String(err);
  }
  if (cardError) {
    log(`  ! card for #${id} not rendered before publishing (${cardError}) — publishing anyway; /api/og draws it until the hourly render has it`);
  }
  await steps.publish();
  return { cardError };
}
