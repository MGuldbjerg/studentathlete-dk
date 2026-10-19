/**
 * Engelske vendinger der er oversat ord for ord og ikke er dansk sportssprog.
 *
 * Mikkel, 2026-10-19: «scorede i 2-4-tabet til …» er ikke dansk — det hedder
 * «2-4-nederlaget». Listen er hentet fra rigtige kladder og fra dansk
 * sportsskrivning; forslaget og begrundelserne står i PROPOSAL-danish-calques.md.
 *
 * Kun mønstre med få falske alarmer kommer med her. Et fund er et FORSLAG til
 * et menneske, ikke en gate (jf. quality-check.ts).
 *
 * Bevidst IKKE med: «faldt til 0-2-0» om en rekord der falder er korrekt dansk
 * (Mikkel, 2026-10-19), og «conference»/«konference» er et valg, ikke en fejl.
 */

export interface CalqueFinding {
  /** Det der stod i teksten. */
  claim: string;
  /** Hvad det skal være. */
  use: string;
}

interface Rule {
  re: RegExp;
  use: string;
  /** Kun relevant hvis denne også matcher et sted i teksten. */
  context?: RegExp;
  /** Fund ignoreres hvis denne matcher lige omkring fundet. */
  unless?: RegExp;
}

const RULES: Rule[] = [
  { re: /\b\d+-\d+-tab(?:et|s)?\b/gi, use: "«X-Y-nederlag» (nederlaget) — resultater hedder sejr, nederlag eller uafgjort" },
  { re: /\bkarriere-?høj(?:de)?\b/gi, use: "«personlig rekord»" },
  { re: /\b\d+-\d+(?:-\d+)? records?\b|\brecord\b/gi, use: "«X sejre og Y nederlag» — «rekord» betyder ny bedste præstation, ikke sejr-nederlag" },
  { re: /\bstempler? ud\b/gi, use: "«afslutter» — oversat ordret fra engelsk, betyder intet på dansk" },
  { re: /\b\d+ starter\b/gi, use: "«N kampe fra start» eller «stod i startopstillingen N gange»" },
  { re: /\bhat[- ]tricks?\b/gi, use: "«hattrick» (ét ord)" },
  { re: /\bfelthockey\b|\bfield hockey\b/gi, use: "«landhockey»" },
  { re: /\bhæderlig omtale\b/gi, use: "«honorable mention» (fast betegnelse, bevares på engelsk)" },
  { re: /\bderby\b/gi, use: "«rival»/«rivalerne» — derby kun mellem hold fra samme by" },
  { re: /\branke(?:t|de|s)?\b/gi, use: "«nr. 11 på ranglisten» / «placeret som nr. 11»" },
  { re: /\bklinch(?:ede|er|et)\b/gi, use: "«sikrede sig» / «afgjorde»" },
  { re: /\b(?:afsluttede|sluttede) (\d+)\.(?! plads)/gi, use: "«blev nr. N» / «sluttede som nr. N»" },
  { re: /\bforstyrrelse\b/gi, use: "«overraskende sejr» (upset)" },
  { re: /\b\d['’]\s?\d{1,2}(?:["”]|'')/g, use: "meter: «1,93 m» (feet og inches er ikke dansk)" },
  { re: /\b\d{1,2}:\d{2}\.\d{1,2}\b/g, use: "decimalkomma i tider: «22:41,9»" },
  {
    re: /\bfodbold(?:s|en|ens|holdet)?\b/gi,
    use: "«amerikansk fodbold» (football) — «fodbold» er soccer",
    context: /\b(?:touchdown|quarterback|tight end|linebacker|running back|wide receiver|field goal)\b/i,
    unless: /\bamerikansk\s+fodbold/i,
  },
];

export function calqueFindings(text: string | null | undefined): CalqueFinding[] {
  const body = text ?? "";
  if (!body.trim()) return [];
  const out: CalqueFinding[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    if (rule.context && !rule.context.test(body)) continue;
    for (const m of body.matchAll(rule.re)) {
      const claim = m[0].toLowerCase();
      if (seen.has(claim)) continue;
      if (rule.unless) {
        const i = m.index ?? 0;
        if (rule.unless.test(body.slice(Math.max(0, i - 12), i + m[0].length + 12))) continue;
      }
      seen.add(claim);
      out.push({ claim: m[0], use: rule.use });
    }
  }
  return out;
}
