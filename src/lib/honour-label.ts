/**
 * How a stored honour reads on a page: profile timeline and season-honours page.
 * ===========================================================================
 *
 * The conference harvest stores the release's own label in athlete_events.summary
 * (conference-honors.ts FoundHonour.detail, 2026-11-09) — verbatim, so some are
 * in capitals ("CACC MEN'S SOCCER ALL-CONFERENCE FIRST TEAM"). Shown:
 *  - English: the label, tidied: capitals to title case (acronyms kept), the
 *    sport phrase dropped (the page around it already says the sport).
 *  - Any other language: a bare English label is not shown on a site that
 *    promises its own language — the bucket's translated name is, as before.
 *  - A sentence (a kept timeline line, an article-harvest summary) as stored.
 */
import { awardLabel } from "./athlete-events";

/** A release label, not a sentence: short, no full stop, not opening with a verb. */
export function isReleaseLabel(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= 80 && !/[.!?]$/.test(t)
    && !/^(named|earned|earns|was|is|has|became|picked|selected|voted|tabbed)\b/i.test(t);
}

/** Words that are words, not acronyms, when a label arrives in capitals. */
const WORDS = new Set(("all first second third team conference league men's women's mens womens soccer football field hockey tennis " +
  "golf volleyball lacrosse rowing swimming diving track cross country basketball softball baseball honorable honourable mention " +
  "freshman rookie newcomer player players year of the and defensive offensive goalkeeper midfielder forward defender keeper " +
  "big ten east west south north sky sun belt atlantic coast valley mountain southern northern eastern western great lakes midwest " +
  "ivy patriot america american pacific summit horizon sunshine state lone star gulf peach missouri ohio colonial northeast mid " +
  "central intercollegiate athletic association region regional district academic newcomers team, team:").split(" "));

const SPORT_PHRASE = /\b(men'?s|women'?s)\s+(soccer|football|field hockey|tennis|golf|volleyball|lacrosse|rowing|swimming(?: (?:and|&) diving)?|cross country|track(?: (?:and|&) field)?|basketball)\b\s*/gi;

export function tidyLabel(text: string): string {
  let t = text.trim();
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length > 6 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.7) {
    t = t.split(/(\s+|-)/).map((w) => {
      const bare = w.toLowerCase().replace(/[^a-z']/g, "");
      if (!bare) return w;
      if (!WORDS.has(bare) && !WORDS.has(w.toLowerCase())) return w; // an acronym: CACC, ECC, MEC
      if (bare === "of" || bare === "the" || bare === "and") return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join("");
  }
  t = t.replace(SPORT_PHRASE, "").replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** The line a stored honour shows. */
export function honourText(summary: string | null, awardName: string, lang: string): string {
  const s = summary?.trim() ?? "";
  if (!s || s === awardName) return awardLabel(awardName, lang) || s;
  if (!isReleaseLabel(s)) return s;
  return lang === "en" ? tidyLabel(s) : awardLabel(awardName, lang) || s;
}
