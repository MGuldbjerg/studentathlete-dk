/**
 * Promptsæt pr. sprog.
 *
 * Genereringen kender ikke et konkret sprog — den slår op her ud fra atletens
 * land (`athletes.home_country` → landeprofil → sprog), præcis som sitet gør
 * for det læservendte (se ARKITEKTUR-motor.md).
 *
 * Ukendt sprog falder tilbage til standardsitets sprog. Det er med vilje ikke
 * en fejl: en atlet uden landekode skal stadig kunne få en artikel, bare på
 * husets standardsprog — hellere en dansk artikel end ingen.
 */
import { buildSystemPrompt, type StyleCorrectionEntry } from "./system";
import { newsPrompt, type ArticleContext } from "./news";
import { featurePrompt } from "./feature";
import { recruitingPrompt } from "./recruiting";
import { seasonUpdatePrompt } from "./season-update";
import {
  buildSystemPromptEn,
  newsPromptEn,
  featurePromptEn,
  recruitingPromptEn,
  seasonUpdatePromptEn,
} from "./en";
import { DEFAULT_LANGUAGE } from "../../../src/lib/i18n";

export interface PromptSet {
  language: string;
  buildSystemPrompt: (
    corrections?: StyleCorrectionEntry[],
    opts?: { jsonOutput?: boolean },
  ) => string;
  news: (context: ArticleContext) => string;
  feature: (context: ArticleContext) => string;
  recruiting: (context: ArticleContext) => string;
  seasonUpdate: (context: ArticleContext) => string;
}

const SETS: Record<string, PromptSet> = {
  da: {
    language: "da",
    buildSystemPrompt,
    news: newsPrompt,
    feature: featurePrompt,
    recruiting: recruitingPrompt,
    seasonUpdate: seasonUpdatePrompt,
  },
  en: {
    language: "en",
    buildSystemPrompt: buildSystemPromptEn,
    news: newsPromptEn,
    feature: featurePromptEn,
    recruiting: recruitingPromptEn,
    seasonUpdate: seasonUpdatePromptEn,
  },
};

export function promptsFor(language: string | null | undefined): PromptSet {
  return SETS[(language ?? "").toLowerCase()] ?? SETS[DEFAULT_LANGUAGE] ?? SETS.da;
}

/** Vælger skabelon ud fra artikeltype — ét sted, så typerne ikke driver. */
export function promptForType(
  set: PromptSet,
  articleType: string,
  context: ArticleContext,
): string {
  switch (articleType) {
    case "feature":
      return set.feature(context);
    case "season_update":
      return set.seasonUpdate(context);
    case "recruiting":
      return set.recruiting(context);
    default:
      return set.news(context);
  }
}
