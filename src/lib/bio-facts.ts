/**
 * Background facts on a profile (PLAN-content-floor-uk.md, P4): the labelled
 * fields of the athlete's official bio page — high school, previous school,
 * major, height — stored as JSON in athletes.bio_facts (migration 072) by
 * pipeline/profiles/bio-facts.ts, written as one or two sentences here.
 * ===========================================================================
 *
 * The values are the school's labels as printed («Epsom H.S.»); nothing from
 * the bio prose. Height is shown in feet and inches as the roster gives it,
 * with metres beside it for a British reader. No pronouns: the surname.
 */

export interface BioFacts {
  highSchool: string | null;
  previousSchool: string | null;
  major: string | null;
  height: string | null;   // as printed: «5-7», «6'1"», «1.85m»
  checked?: string;        // YYYY-MM-DD the page was read
}

/** «5-7», «5'7"», «5′ 7″» → inches; «1.85m» / «185 cm» → centimetres. */
export function heightCm(h: string | null): { cm: number; ft: number; inch: number } | null {
  if (!h) return null;
  const s = h.trim();
  const imp = /^(\d)\s*(?:-|'|′|ft\.?)\s*(\d{1,2})\s*(?:"|″|in\.?)?$/i.exec(s);
  if (imp) {
    const ft = Number(imp[1]), inch = Number(imp[2]);
    if (inch > 11 || ft < 4 || ft > 7) return null;
    return { cm: Math.round((ft * 12 + inch) * 2.54), ft, inch };
  }
  const m = /^(\d)[.,](\d{2})\s*m$/i.exec(s) ?? null;
  const cmM = /^(\d{3})\s*cm$/i.exec(s);
  const cm = m ? Number(`${m[1]}${m[2]}`) : cmM ? Number(cmM[1]) : null;
  if (!cm || cm < 140 || cm > 225) return null;
  const inchesTotal = Math.round(cm / 2.54);
  return { cm, ft: Math.floor(inchesTotal / 12), inch: inchesTotal % 12 };
}

/** A full stop, unless the school's own value already ends in one («Epsom H.S.»). */
const stop = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

/** One or two sentences, or "" when the page gave nothing we can use. */
export function bioParagraph(f: BioFacts, name: string, school: string, previousSchool: string | null, lang: string): string {
  const da = lang === "da";
  const who = name.trim().split(/\s+/).pop() ?? name;
  const out: string[] = [];
  const before = [f.highSchool, previousSchool ?? f.previousSchool].filter((x): x is string => !!x && x !== school);
  if (before.length) {
    out.push(stop(da
      ? `Før ${school} gik ${who} på ${before.join(" og derefter ")}`
      : `Before ${school}, ${who} attended ${before.join(" and then ")}`));
  }
  const h = heightCm(f.height);
  if (h) {
    const metres = (h.cm / 100).toFixed(2);
    out.push(stop(da
      ? `${school}s spillertrup opgiver ${who} til ${metres.replace(".", ",")} m${f.major ? `, og ${who} læser ${f.major}` : ""}`
      : `${school}'s roster lists ${who} at ${h.ft} ft ${h.inch} in (${metres} m)${f.major ? `, studying ${f.major}` : ""}`));
  } else if (f.major) {
    out.push(stop(da ? `${who} læser ${f.major} på ${school}` : `${who} is studying ${f.major} at ${school}`));
  }
  return out.join(" ");
}

export function readBioFacts(json: string | null | undefined): BioFacts | null {
  if (!json) return null;
  try {
    const f = JSON.parse(json) as BioFacts;
    return f && typeof f === "object" ? f : null;
  } catch {
    return null;
  }
}
