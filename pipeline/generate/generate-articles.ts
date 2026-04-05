/**
 * Genererer artikeludkast fra fundne historier via LLM provider-kæde.
 * Kør med: npx tsx pipeline/generate/generate-articles.ts
 *
 * Prøver gratis providere i rækkefølge: Mistral → Gemini → Groq → CF AI → Anthropic.
 * Gemmer kladder i articles-tabellen med published = 0.
 */

import { createD1Client } from "../lib/d1-client";
import { generateSlug } from "../lib/slug";
import { ProviderChain } from "../lib/llm/provider-chain";
import { buildSystemPrompt } from "./prompts/system";
import type { StyleCorrectionEntry } from "./prompts/system";
import { newsPrompt } from "./prompts/news";
import { featurePrompt } from "./prompts/feature";
import { seasonUpdatePrompt } from "./prompts/season-update";
import { recruitingPrompt } from "./prompts/recruiting";
import { parseArticleOutput } from "./parse-output";
import type { ArticleContext } from "./prompts/news";
import type { Story } from "../lib/types";

interface StoryWithAthlete extends Story {
  athlete_name: string;
  preferred_name: string | null;
  sport: string;
  university: string;
  hometown: string | null;
}

function selectArticleType(story: StoryWithAthlete): string {
  const headline = (story.headline ?? "").toLowerCase();
  const content = (story.content_raw ?? "").toLowerCase();
  const text = `${headline} ${content}`;

  if (text.includes("commit") || text.includes("sign") || text.includes("recruit")) {
    return "recruiting";
  }
  if (text.includes("season") || text.includes("recap") || text.includes("wrap")) {
    return "season_update";
  }
  if (story.relevance_score > 70) return "feature";
  return "news";
}

function buildPrompt(
  story: StoryWithAthlete,
  articleType: string,
): string {
  const context: ArticleContext = {
    athleteName: story.athlete_name,
    preferredName: story.preferred_name,
    sport: story.sport,
    university: story.university,
    hometown: story.hometown,
    sourceUrl: story.source_url,
    headline: story.headline ?? "",
    content: story.content_raw ?? story.summary ?? "",
  };

  switch (articleType) {
    case "feature":
      return featurePrompt(context);
    case "season_update":
      return seasonUpdatePrompt(context);
    case "recruiting":
      return recruitingPrompt(context);
    default:
      return newsPrompt(context);
  }
}

// ─── Sikkerhedsnet ──────────────────────────────────────────────────────────
// Maks antal artikler per kørsel (forhindrer løbsk token-forbrug)
const MAX_ARTICLES_PER_RUN = 5;
// Maks antal kladder der må ligge ugodkendt (pause hvis for mange hober sig op)
const MAX_PENDING_DRAFTS = 20;

async function main(): Promise<void> {
  const db = createD1Client();
  const chain = new ProviderChain(db);

  const available = chain.getAvailableProviders();
  if (available.length === 0) {
    console.log(
      "Ingen LLM-providere tilgængelige. Sæt mindst én af:\n" +
        "  MISTRAL_API_KEY, GEMINI_API_KEY, GROQ_API_KEY,\n" +
        "  CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID, ANTHROPIC_API_KEY",
    );
    return;
  }
  console.log(`Tilgængelige LLM-providere: ${available.join(", ")}`);

  // Hent stilguide-rettelser
  const corrResult = await db.query<StyleCorrectionEntry>(
    "SELECT wrong_phrase, correct_phrase, note FROM style_corrections WHERE active = 1 LIMIT 50",
  );
  const corrections = corrResult.results;
  const systemPrompt = buildSystemPrompt(corrections);
  console.log(`Stilguide: ${corrections.length} rettelse(r) loaded`);

  // Sikkerhedsnet 1: Tjek antal ventende kladder
  const draftCount = await db.query<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM articles WHERE published = 0",
  );
  const pendingDrafts = draftCount.results[0]?.cnt ?? 0;
  if (pendingDrafts >= MAX_PENDING_DRAFTS) {
    console.log(
      `⚠ ${pendingDrafts} ugodkendte kladder — springer generering over. Godkend eller afvis kladder i admin-panelet.`,
    );
    return;
  }

  // Sikkerhedsnet 2: Reset stories der har siddet i "drafting" i over 1 time (crashed run)
  await db.execute(
    `UPDATE stories SET status = 'new'
     WHERE status = 'drafting'
     AND datetime(discovered_at, '+1 hour') < datetime('now')`,
  );

  // Hent nye historier der endnu ikke er konverteret
  const result = await db.query<StoryWithAthlete>(
    `SELECT s.*, a.name as athlete_name, a.preferred_name, a.sport, a.university, a.hometown
     FROM stories s
     JOIN athletes a ON s.athlete_id = a.id
     WHERE s.status = 'new'
     AND s.content_raw IS NOT NULL
     AND datetime(s.discovered_at, '+14 days') >= datetime('now')
     ORDER BY s.relevance_score DESC
     LIMIT ?`,
    [MAX_ARTICLES_PER_RUN],
  );

  const stories = result.results;

  if (stories.length === 0) {
    console.log("Ingen nye historier at generere artikler fra.");
    return;
  }

  console.log(`Genererer artikler for ${stories.length} historie(r) (maks ${MAX_ARTICLES_PER_RUN} per kørsel)...\n`);

  let generated = 0;
  let totalTokens = 0;

  for (const story of stories) {
    // Sikkerhedsnet 3: Tjek om der allerede findes en artikel for denne story
    const existing = await db.query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM articles WHERE story_id = ?",
      [story.id],
    );
    if ((existing.results[0]?.cnt ?? 0) > 0) {
      console.log(`  ⊘ Story ${story.id} har allerede en artikel — springer over.`);
      await db.execute('UPDATE stories SET status = ? WHERE id = ?', ["drafted", story.id]);
      continue;
    }

    const articleType = selectArticleType(story);
    const prompt = buildPrompt(story, articleType);

    // Marker som "drafting" så den ikke behandles igen
    await db.execute('UPDATE stories SET status = ? WHERE id = ?', [
      "drafting",
      story.id,
    ]);

    try {
      const response = await chain.generate({
        system: systemPrompt,
        prompt,
        max_tokens: 2000,
      });

      const parsed = parseArticleOutput(response.text, articleType);
      const slug = generateSlug(parsed.title);

      // Gem som kladde (published = 0) — original_content gemmer LLM-output inden redigering
      await db.execute(
        `INSERT INTO articles
         (title, slug, content, summary, article_type, athlete_id,
          source_url, story_id, model_used, tokens_input, tokens_output,
          published, author, llm_provider, original_content)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'StudentAthlete.dk', ?, ?)`,
        [
          parsed.title,
          slug,
          parsed.content,
          parsed.summary,
          parsed.article_type,
          story.athlete_id,
          story.source_url,
          story.id,
          response.model,
          response.tokens_input,
          response.tokens_output,
          response.provider,
          parsed.content,
        ],
      );

      // Opdater story status
      await db.execute(
        'UPDATE stories SET status = ?, processed_at = datetime("now") WHERE id = ?',
        ["drafted", story.id],
      );

      generated++;
      totalTokens += response.tokens_input + response.tokens_output;
      console.log(
        `  ✓ "${parsed.title}" (${response.provider}/${response.model}, ${response.tokens_input}+${response.tokens_output} tokens)`,
      );
    } catch (err) {
      console.error(`  ✗ Fejl ved story ${story.id}: ${err}`);
      // Sæt tilbage til "new" så den kan prøves igen
      await db.execute('UPDATE stories SET status = ? WHERE id = ?', [
        "new",
        story.id,
      ]);
    }
  }

  console.log(`\nFærdig. Genereret ${generated} artikeludkast. Token-forbrug: ~${totalTokens}.`);
}

main().catch((err) => {
  console.error("Artikelgenerering fejlede:", err);
  process.exit(1);
});
