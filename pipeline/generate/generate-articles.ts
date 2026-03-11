/**
 * Genererer artikeludkast fra fundne historier via Claude API.
 * Kør med: npx tsx pipeline/generate/generate-articles.ts
 *
 * Kræver: ANTHROPIC_API_KEY miljøvariabel.
 * Gemmer kladder i articles-tabellen med published = 0.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createD1Client } from "../lib/d1-client";
import { generateSlug } from "../lib/slug";
import { SYSTEM_PROMPT } from "./prompts/system";
import { newsPrompt } from "./prompts/news";
import { featurePrompt } from "./prompts/feature";
import { seasonUpdatePrompt } from "./prompts/season-update";
import { recruitingPrompt } from "./prompts/recruiting";
import { parseArticleOutput } from "./parse-output";
import type { ArticleContext } from "./prompts/news";
import type { Story } from "../lib/types";

interface StoryWithAthlete extends Story {
  athlete_name: string;
  sport: string;
  university: string;
  hometown: string | null;
}

// Haiku for korte nyheder, Sonnet for features
function selectModel(story: StoryWithAthlete): string {
  if (story.relevance_score > 70) return "claude-sonnet-4-5-20250929";
  return "claude-haiku-4-5-20241022";
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

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Mangler ANTHROPIC_API_KEY. Sæt den i miljøvariabler.");
    process.exit(1);
  }

  const anthropic = new Anthropic();
  const db = createD1Client();

  // Hent nye historier der endnu ikke er konverteret
  const result = await db.query<StoryWithAthlete>(
    `SELECT s.*, a.name as athlete_name, a.sport, a.university, a.hometown
     FROM stories s
     JOIN athletes a ON s.athlete_id = a.id
     WHERE s.status = 'new'
     AND s.content_raw IS NOT NULL
     ORDER BY s.relevance_score DESC
     LIMIT 10`,
  );

  const stories = result.results;

  if (stories.length === 0) {
    console.log("Ingen nye historier at generere artikler fra.");
    return;
  }

  console.log(`Genererer artikler for ${stories.length} historie(r)...\n`);

  let generated = 0;

  for (const story of stories) {
    const articleType = selectArticleType(story);
    const model = selectModel(story);
    const prompt = buildPrompt(story, articleType);

    // Marker som "drafting" så den ikke behandles igen
    await db.execute('UPDATE stories SET status = ? WHERE id = ?', [
      "drafting",
      story.id,
    ]);

    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";

      const parsed = parseArticleOutput(text, articleType);
      const slug = generateSlug(parsed.title);

      // Gem som kladde (published = 0)
      await db.execute(
        `INSERT INTO articles
         (title, slug, content, summary, article_type, athlete_id,
          source_url, story_id, model_used, tokens_input, tokens_output,
          published, author)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'StudentAthlete.dk')`,
        [
          parsed.title,
          slug,
          parsed.content,
          parsed.summary,
          parsed.article_type,
          story.athlete_id,
          story.source_url,
          story.id,
          model,
          response.usage.input_tokens,
          response.usage.output_tokens,
        ],
      );

      // Opdater story status
      await db.execute(
        'UPDATE stories SET status = ?, processed_at = datetime("now") WHERE id = ?',
        ["drafted", story.id],
      );

      generated++;
      console.log(
        `  ✓ "${parsed.title}" (${model}, ${response.usage.input_tokens}+${response.usage.output_tokens} tokens)`,
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

  console.log(`\nFærdig. Genereret ${generated} artikeludkast.`);
}

main().catch((err) => {
  console.error("Artikelgenerering fejlede:", err);
  process.exit(1);
});
