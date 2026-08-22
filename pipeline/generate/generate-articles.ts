/**
 * Genererer artikeludkast fra fundne historier via LLM provider-kæde.
 * Kør med: npx tsx pipeline/generate/generate-articles.ts
 *
 * Prøver gratis providere i rækkefølge: Mistral → Gemini → Groq → CF AI → Anthropic.
 * Gemmer kladder i articles-tabellen med published = 0.
 */

import { createD1Client } from "../lib/d1-client";
import { generateSlug } from "../../src/lib/slug";
import { ProviderChain } from "../lib/llm/provider-chain";
import type { StyleCorrectionEntry } from "./prompts/system";
import { promptsFor, promptForType, type PromptSet } from "./prompts";
import { countryProfile, DEFAULT_COUNTRY } from "../../src/lib/countries";
import { parseArticleOutputSmart } from "./parse-output";
import { renderFactSheet, type FactSheet } from "./build-factsheet";
import type { ArticleContext } from "./prompts/news";
import type { Story } from "../lib/types";
import { timelineForGeneration, currentSeasonStart, type AthleteEvent } from "./timeline";
import { sensitiveCareBlock, type SensitiveType } from "../discover/sensitive";
import { checkStoryIdentity, hasUnsourcedQuote } from "./identity-guard";
import { checkEventTiming } from "./event-timing";
import { MIN_RELEVANCE_GENERATE } from "../discover/extract-story";
import { notifyDraftsReady, notifyFailure } from "../lib/notify";

interface StoryWithAthlete extends Story {
  athlete_name: string;
  preferred_name: string | null;
  sport: string;
  university: string;
  hometown: string | null;
  position: string | null;
  division: string | null;
  class_year: string | null;
  previous_school: string | null;
  expected_graduation: string | null;
  fact_sheet: string | null;
  sensitive: string | null;
  /** Atletens nationalitet (migration 034). Bestemmer sprog OG artiklens site. */
  home_country: string | null;
  /** "f" | "m" | null (migration 039). Stedord er fakta, ikke et gæt fra kilden. */
  gender: string | null;
}

/**
 * Hvilket sprog skal artiklen skrives på? Nationaliteten er data, så den
 * afgør både promptsæt og hvilket site artiklen tilhører — ikke en antagelse
 * om at alt i basen er dansk.
 */
function siteFor(story: StoryWithAthlete): { country: string; prompts: PromptSet } {
  const country = (story.home_country ?? DEFAULT_COUNTRY).toUpperCase();
  return { country, prompts: promptsFor(countryProfile(country).language) };
}

function selectArticleType(story: StoryWithAthlete): string {
  const headline = (story.headline ?? "").toLowerCase();
  const content = (story.content_raw ?? "").toLowerCase();
  const text = `${headline} ${content}`;

  // Lange formater (feature/season_update) kræver reelt indhold — ellers tvinges
  // modellen til at fylde 400-1200 ord med opdigtet stof. Headline-only → news.
  const hasRichContent =
    !!story.content_raw || (story.summary?.length ?? 0) > 100;

  if (text.includes("commit") || text.includes("sign") || text.includes("recruit")) {
    return "recruiting";
  }
  if (hasRichContent && (text.includes("season") || text.includes("recap") || text.includes("wrap"))) {
    return "season_update";
  }
  if (hasRichContent && story.relevance_score > 70) return "feature";
  return "news";
}

function buildPrompt(
  story: StoryWithAthlete,
  articleType: string,
  prompts: PromptSet,
  timeline = "",
): string {
  // KILDEINDHOLD = faktaarket (fase 1). Det er det ENESTE skrivefasen må bruge.
  let factsBlock = "";
  if (story.fact_sheet) {
    try {
      factsBlock = renderFactSheet(JSON.parse(story.fact_sheet) as FactSheet);
    } catch {
      /* falder tilbage til rå indhold nedenfor */
    }
  }
  const context: ArticleContext = {
    athleteName: story.athlete_name,
    preferredName: story.preferred_name,
    sport: story.sport,
    university: story.university,
    hometown: story.hometown,
    position: story.position,
    division: story.division,
    classYear: story.class_year,
    previousSchool: story.previous_school,
    expectedGraduation: story.expected_graduation,
    gender: story.gender,
    sourceUrl: story.source_url,
    headline: story.headline ?? "",
    content: factsBlock || story.content_raw?.slice(0, 4000) || story.summary?.slice(0, 2000) || "",
    timeline,
  };

  let prompt = promptForType(prompts, articleType, context);

  // Følsom historie (anholdelse/disciplin/spilleberettigelse/personligt) →
  // nøgternheds-instruks. Kladden skal desuden altid gennem Mikkels skærpede
  // review (rød badge i admin via stories.sensitive).
  if (story.sensitive) {
    prompt += `\n\n${sensitiveCareBlock(story.sensitive as SensitiveType)}`;
  }
  return prompt;
}

// ─── Sikkerhedsnet ──────────────────────────────────────────────────────────
// Maks antal artikler per kørsel (forhindrer løbsk token-forbrug)
const MAX_ARTICLES_PER_RUN = 5;
// Maks antal kladder der må ligge ugodkendt (pause hvis for mange hober sig op)
const MAX_PENDING_DRAFTS = 20;

function parseArgs(): { maxAgeDays: number } {
  const args = process.argv.slice(2);
  let maxAgeDays = 7; // 7 dage: fanger nyheder der er opdaget men ikke endnu genereret
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max-age-days" && args[i + 1]) {
      maxAgeDays = parseInt(args[i + 1], 10) || 7;
    }
  }
  return { maxAgeDays };
}

async function main(): Promise<void> {
  const { maxAgeDays } = parseArgs();
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
    "SELECT wrong_phrase, correct_phrase, note, rule_type FROM style_corrections WHERE active = 1 LIMIT 50",
  );
  const corrections = corrResult.results;
  // System-prompten bygges PR. HISTORIE nede i løkken, ikke her: sproget følger
  // atletens nationalitet, så en dansk og en britisk historie i samme kørsel
  // skal have hver sit promptsæt.
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
    console.log(`SKIP_REASON=max_pending_drafts pending=${pendingDrafts} threshold=${MAX_PENDING_DRAFTS}`);
    return;
  }

  // Sikkerhedsnet 2: Reset stories der har siddet i "drafting" i over 1 time (crashed run)
  await db.execute(
    `UPDATE stories SET status = 'new'
     WHERE status = 'drafting'
     AND datetime(discovered_at, '+1 hour') < datetime('now')`,
  );

  // Diagnostik: vis hvad der faktisk ligger i databasen
  const diagResult = await db.query<{
    total: number;
    has_content: number;
    summary_only: number;
    headline_only: number;
    too_old: number;
  }>(
    `SELECT
       COUNT(CASE WHEN datetime(discovered_at, '+' || ? || ' days') >= datetime('now') THEN 1 END) as total,
       COUNT(CASE WHEN content_raw IS NOT NULL AND datetime(discovered_at, '+' || ? || ' days') >= datetime('now') THEN 1 END) as has_content,
       COUNT(CASE WHEN content_raw IS NULL AND summary IS NOT NULL AND datetime(discovered_at, '+' || ? || ' days') >= datetime('now') THEN 1 END) as summary_only,
       COUNT(CASE WHEN content_raw IS NULL AND summary IS NULL AND datetime(discovered_at, '+' || ? || ' days') >= datetime('now') THEN 1 END) as headline_only,
       COUNT(CASE WHEN datetime(discovered_at, '+' || ? || ' days') < datetime('now') THEN 1 END) as too_old
     FROM stories WHERE status = 'new'`,
    [maxAgeDays, maxAgeDays, maxAgeDays, maxAgeDays, maxAgeDays],
  );
  const diag = diagResult.results[0];
  console.log(`\nHistorier (status='new', seneste ${maxAgeDays} dage):`);
  console.log(`  Fuldt indhold (content_raw): ${diag?.has_content ?? 0}`);
  console.log(`  Kun summary:                 ${diag?.summary_only ?? 0}`);
  console.log(`  Kun headline:                ${diag?.headline_only ?? 0}`);
  console.log(`  For gamle (ignoreres):       ${diag?.too_old ?? 0}`);
  console.log(`  Total inden for vindue:      ${diag?.total ?? 0}\n`);

  // Faktaark-status (skrivefasen kræver fact_status='built' — kør build-factsheet.ts først)
  const fsRes = await db.query<{ built: number; pending: number; no_substance: number }>(
    `SELECT
       COUNT(CASE WHEN fact_status = 'built' THEN 1 END) as built,
       COUNT(CASE WHEN fact_status IS NULL THEN 1 END) as pending,
       COUNT(CASE WHEN fact_status = 'no_substance' THEN 1 END) as no_substance
     FROM stories
     WHERE status = 'new' AND datetime(discovered_at, '+' || ? || ' days') >= datetime('now')`,
    [maxAgeDays],
  );
  const fs = fsRes.results[0];
  console.log(`Faktaark: ${fs?.built ?? 0} klar · ${fs?.pending ?? 0} mangler (kør build-factsheet) · ${fs?.no_substance ?? 0} uden substans\n`);

  // Hent nye historier der endnu ikke er konverteret.
  // content_raw er ikke påkrævet — summary fra RSS-feeds er nok til artikelgenerering.
  // Sortering: foretrækker rigt indhold (content_raw > summary > headline).
  const result = await db.query<StoryWithAthlete>(
    `SELECT s.*, a.name as athlete_name, a.preferred_name, a.sport, a.university, a.hometown,
            a.position, a.division, a.class_year, a.expected_graduation, a.home_country,
            a.previous_school,
            a.gender
     FROM stories s
     JOIN athletes a ON s.athlete_id = a.id
     WHERE s.status = 'new'
     AND s.fact_status = 'built'
     -- Et efternavns-match (35) er nok til at OVERVÅGE en historie, men ikke
     -- til at skrive om et navngivent menneske. Se MIN_RELEVANCE_GENERATE.
     AND s.relevance_score >= ?
     AND datetime(s.discovered_at, '+' || ? || ' days') >= datetime('now')
     ORDER BY
       CASE WHEN s.content_raw IS NOT NULL THEN 0 WHEN s.summary IS NOT NULL THEN 1 ELSE 2 END,
       s.relevance_score DESC
     LIMIT ?`,
    [MIN_RELEVANCE_GENERATE, maxAgeDays, MAX_ARTICLES_PER_RUN],
  );

  const stories = result.results;

  if (stories.length === 0) {
    console.log("Ingen nye historier at generere artikler fra.");
    if ((diag?.too_old ?? 0) > 0) {
      console.log(`  Tip: ${diag?.too_old} historier findes men er ældre end ${maxAgeDays} dage. Kør med --max-age-days 7 for at inkludere dem.`);
    }
    console.log(`SKIP_REASON=no_eligible_stories window_days=${maxAgeDays} has_content=${diag?.has_content ?? 0} summary_only=${diag?.summary_only ?? 0} headline_only=${diag?.headline_only ?? 0} too_old=${diag?.too_old ?? 0} pending_drafts=${pendingDrafts}`);
    return;
  }

  console.log(`Genererer artikler for ${stories.length} historie(r) (maks ${MAX_ARTICLES_PER_RUN} per kørsel)...\n`);

  let generated = 0;
  let totalTokens = 0;
  // Kladder pr. land: hvert site har sin egen kø og sin egen Discord-kanal, så
  // beskeden "n kladder klar" skal kunne sendes ét sted pr. land.
  const draftsByCountry = new Map<string, string[]>();
  const failuresByCountry = new Map<string, string[]>();
  let blockedByGuard = 0;

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

    /**
     * IDENTITETSVAGT — før modellen overhovedet kaldes.
     *
     * Handler kilden om DEN atlet vi har koblet den til? To af de fem første
     * britiske kladder handlede om et andet menneske med samme efternavn
     * (2026-08-06). Ingen promptregel kan redde det: modellen får en atlet-blok
     * om ét menneske og et faktaark om et andet.
     */
    const identity = checkStoryIdentity({
      athleteName: story.athlete_name,
      gender: story.gender,
      sport: story.sport,
      sourceText: [story.headline, story.summary, story.content_raw, story.fact_sheet]
        .filter(Boolean)
        .join("\n"),
    });
    if (!identity.ok) {
      console.log(`  ⛔ Story ${story.id} (${story.athlete_name}): ${identity.reason}`);
      await db.execute(
        "UPDATE stories SET status = 'rejected', processed_at = datetime('now') WHERE id = ?",
        [story.id],
      );
      blockedByGuard++;
      continue;
    }

    /**
     * FORHÅNDSOMTALE-VAGT — også før modellen kaldes.
     *
     * En kampannoncering har en dato og ingenting andet. Får modellen den, skriver
     * den referatet alligevel og finder på indholdet (kladde #107, 2026-08-16).
     *
     * Afvises permanent, ikke sat i kø: annonceringen bliver aldrig til et referat
     * — skolen udgiver referatet som en SELVSTÆNDIG nyhed, som discovery finder
     * som sin egen historie med sit eget faktaark. Ventede vi i stedet på at
     * datoen passerede, ville præcis den samme tomme mappe gå videre til modellen.
     */
    const timing = checkEventTiming({ factSheet: story.fact_sheet, now: new Date() });
    if (!timing.ok) {
      console.log(`  ⏳ Story ${story.id} (${story.athlete_name}): ${timing.reason}`);
      await db.execute(
        "UPDATE stories SET status = 'rejected', processed_at = datetime('now') WHERE id = ?",
        [story.id],
      );
      blockedByGuard++;
      continue;
    }

    const articleType = selectArticleType(story);
    let timeline = "";
    try {
      const evRes = await db.query<AthleteEvent>(
        "SELECT season, award_name, significance, summary FROM athlete_events WHERE athlete_id = ?",
        [story.athlete_id],
      );
      const lines = timelineForGeneration(evRes.results ?? [], currentSeasonStart());
      if (lines.length) timeline = lines.join("\n");
    } catch {
      /* tidslinje må aldrig blokere generering */
    }
    const { country, prompts } = siteFor(story);
    // JSON-mode: providerens API håndhæver gyldig JSON → ingen fed-titel/tomme
    // kladder fra gratis-modeller. parseArticleOutputSmart falder tilbage til
    // linjeformatet hvis en provider alligevel svarer med rå markdown.
    const systemPrompt = prompts.buildSystemPrompt(corrections, { jsonOutput: true });
    const prompt = buildPrompt(story, articleType, prompts, timeline);

    const contentSource = story.content_raw ? "content_raw" : story.summary ? "summary" : "headline only";
    console.log(
      `  → Story ${story.id}: ${story.athlete_name} — kilde: ${contentSource}, type: ${articleType}, land: ${country} (${prompts.language})`,
    );

    // Marker som "drafting" så den ikke behandles igen
    await db.execute('UPDATE stories SET status = ? WHERE id = ?', [
      "drafting",
      story.id,
    ]);

    try {
      // Lange/risikofyldte formater skrives bedst af Claude når nøglen findes;
      // korte nyheder bliver på den gratis kæde. Dormant indtil ANTHROPIC_API_KEY sættes.
      const preferProvider =
        articleType === "feature" || articleType === "season_update"
          ? "anthropic"
          : undefined;
      const response = await chain.generate({
        system: systemPrompt,
        prompt,
        max_tokens: 2000,
        json: true,
        preferProvider,
      });

      const parsed = parseArticleOutputSmart(response.text, articleType);

      /**
       * CITATVAGT: ord lagt i munden på et navngivent menneske er den værste
       * fejl sitet kan lave. Har faktaarket ingen citater, må kladden ikke
       * indeholde ét — den skrives ikke til basen, så den kan ikke godkendes
       * ved et uheld. Kladde #99 (2026-08-06) tillagde en cheftræner to
       * sætninger han aldrig har sagt.
       */
      let sheetQuoteCount = 0;
      try {
        sheetQuoteCount = story.fact_sheet
          ? ((JSON.parse(story.fact_sheet) as FactSheet).quotes ?? []).length
          : 0;
      } catch {
        sheetQuoteCount = 0;
      }
      if (hasUnsourcedQuote(`${parsed.title}\n${parsed.content}`, sheetQuoteCount)) {
        console.log(`  ⛔ Story ${story.id}: kladden indeholder et citat, men faktaarket har ingen — kasseret`);
        await db.execute(
          "UPDATE stories SET status = 'rejected', processed_at = datetime('now') WHERE id = ?",
          [story.id],
        );
        blockedByGuard++;
        continue;
      }

      const slug = generateSlug(parsed.title);

      // Gem som kladde (published = 0) — original_content gemmer LLM-output inden redigering
      await db.execute(
        // `country` afgør hvilket site artiklen hører til (migration 034), og
        // `author` er sitets eget brand — ikke en konstant, nu hvor der er
        // mere end ét site.
        `INSERT INTO articles
         (title, slug, content, summary, article_type, athlete_id,
          source_url, story_id, model_used, tokens_input, tokens_output,
          published, author, llm_provider, original_content, country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
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
          countryProfile(country).brand,
          response.provider,
          parsed.content,
          country,
        ],
      );

      // Opdater story status
      await db.execute(
        'UPDATE stories SET status = ?, processed_at = datetime("now") WHERE id = ?',
        ["drafted", story.id],
      );

      generated++;
      totalTokens += response.tokens_input + response.tokens_output;
      draftsByCountry.set(country, [...(draftsByCountry.get(country) ?? []), parsed.title]);
      console.log(
        `  ✓ "${parsed.title}" (${response.provider}/${response.model}, ${response.tokens_input}+${response.tokens_output} tokens)`,
      );
    } catch (err) {
      console.error(`  ✗ Fejl ved story ${story.id}: ${err}`);
      failuresByCountry.set(country, [
        ...(failuresByCountry.get(country) ?? []),
        `Story ${story.id} (${story.athlete_name}): ${err}`,
      ]);
      // Sæt tilbage til "new" så den kan prøves igen
      await db.execute('UPDATE stories SET status = ? WHERE id = ?', [
        "new",
        story.id,
      ]);
    }
  }

  console.log(`\nFærdig. Genereret ${generated} artikeludkast. Token-forbrug: ~${totalTokens}.`);
  if (blockedByGuard > 0) {
    console.log(`${blockedByGuard} historie(r) afvist af identitets-/citatvagten — se ⛔ ovenfor.`);
  }

  // Notifikationer til sidst: én besked pr. land frem for én pr. kladde, og
  // efter løkken så en webhook-fejl aldrig kan afbryde genereringen.
  for (const [country, titles] of draftsByCountry) {
    await notifyDraftsReady(country, titles.length, titles);
  }
  for (const [country, errors] of failuresByCountry) {
    await notifyFailure(
      country,
      `Generering fejlede for ${errors.length} historie(r)`,
      errors.join("\n"),
    );
  }
}

main().catch((err) => {
  console.error("Artikelgenerering fejlede:", err);
  process.exit(1);
});
