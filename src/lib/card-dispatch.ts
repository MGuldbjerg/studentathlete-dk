/**
 * Ask GitHub to render a just-published article's card NOW.
 * ========================================================
 *
 * The Worker publishes (/admin, MCP `publish_draft` → publishArticle) but must
 * not render: satori is over the free plan's CPU budget. So after the publish
 * it fires a `workflow_dispatch` of render-cards.yml with `article=<id>`, and
 * the card exists a minute or two later instead of at the next :05.
 *
 * Fire-and-forget in effect: a short timeout, never throws, failures logged.
 * Missing it costs only time — the page links /api/og (which draws the card)
 * until the card exists (getArticleCoverUrl/card_ready), the social queue waits
 * for the card (cardReadyClause), and the hourly render and social-post.yml's
 * own render step pick the article up anyway.
 *
 * Needs the Worker secret GITHUB_TOKEN with Actions write on the repo (the same
 * token the admin pipeline buttons use, src/app/api/admin/pipeline/trigger).
 */

export const RENDER_REPO = "MGuldbjerg/studentathlete-dk";
export const RENDER_WORKFLOW = "render-cards.yml";
const TIMEOUT_MS = 3000;

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** The dispatch request, as a pure function (tested). */
export function renderDispatchRequest(articleId: number, token: string): { url: string; init: RequestInit } {
  return {
    url: `https://api.github.com/repos/${RENDER_REPO}/actions/workflows/${RENDER_WORKFLOW}/dispatches`,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "studentathlete-dk",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs: { article: String(articleId) } }),
    },
  };
}

/** true when GitHub accepted the dispatch (204). Never throws. */
export async function dispatchCardRender(
  articleId: number,
  token: string | undefined,
  fetchImpl: FetchLike = (i, init) => fetch(i, init),
): Promise<boolean> {
  if (!Number.isInteger(articleId) || articleId <= 0) return false;
  if (!token) {
    console.error(`card render for #${articleId} not dispatched: GITHUB_TOKEN is not set (the hourly render covers it)`);
    return false;
  }
  const { url, init } = renderDispatchRequest(articleId, token);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { ...init, signal: ctrl.signal });
    if (res.status === 204) return true;
    const body = await res.text().catch(() => "");
    console.error(`card render for #${articleId} not dispatched: GitHub ${res.status} ${body.slice(0, 200)}`);
    return false;
  } catch (err) {
    console.error(`card render for #${articleId} not dispatched: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
