// Faktaark-panel til review: viser fase 1-faktaarket (den ENESTE kilde writeren
// måtte bruge) ved siden af kladden. Spejler FactSheet-formen fra
// pipeline/generate/build-factsheet.ts — duplikeret her fordi pipeline/ er
// ekskluderet fra Next-builden.
interface TaggedFact {
  text: string;
  source: "prose" | "boxscore";
}

interface FactSheetShape {
  event: { type: string | null; date: string | null; opponent: string | null; competition: string | null } | null;
  result: { final_score: string | null; outcome: string | null; placement: string | null } | null;
  stats: TaggedFact[];
  qualitative: TaggedFact[];
  quotes: Array<TaggedFact & { speaker?: string }>;
  other_facts: TaggedFact[];
  box_score_url: string | null;
}

function parseFactSheet(json: string | null): FactSheetShape | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as Partial<FactSheetShape>;
    return {
      event: raw.event ?? null,
      result: raw.result ?? null,
      stats: Array.isArray(raw.stats) ? raw.stats : [],
      qualitative: Array.isArray(raw.qualitative) ? raw.qualitative : [],
      quotes: Array.isArray(raw.quotes) ? raw.quotes : [],
      other_facts: Array.isArray(raw.other_facts) ? raw.other_facts : [],
      box_score_url: typeof raw.box_score_url === "string" ? raw.box_score_url : null,
    };
  } catch {
    return null;
  }
}

function SourceTag({ source }: { source: "prose" | "boxscore" }) {
  if (source !== "boxscore") return null;
  return (
    <span
      className="ml-1 text-[10px] font-semibold px-1 py-0.5 rounded align-middle"
      style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}
    >
      box score
    </span>
  );
}

function FactList({ heading, facts }: { heading: string; facts: TaggedFact[] }) {
  if (facts.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-ink mb-1">{heading}</p>
      <ul className="text-xs text-muted list-disc list-inside space-y-0.5">
        {facts.map((f, i) => (
          <li key={i}>
            {f.text}
            <SourceTag source={f.source} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FactSheetPanel({
  factSheetJson,
  factStatus,
  sourceUrl,
  headline,
}: {
  factSheetJson: string | null;
  factStatus: string | null;
  sourceUrl: string | null;
  headline: string | null;
}) {
  const fs = parseFactSheet(factSheetJson);

  return (
    <aside className="bg-paper rounded-lg border border-border p-4 h-fit lg:sticky lg:top-4">
      <h2 className="text-sm font-bold text-ink mb-1">Faktaark</h2>
      <p className="text-[11px] text-muted mb-3">
        Artiklen er skrevet udelukkende fra disse fakta. Alt i kladden, der ikke står her, er uden kildebelæg.
      </p>

      {!fs ? (
        <p className="text-xs text-muted">
          {factStatus === "no_substance"
            ? "Ingen substans fundet i kilden (gate: no_substance)."
            : "Intet faktaark — artiklen er ældre end to-fase-pipelinen eller skrevet manuelt."}
        </p>
      ) : (
        <>
          {fs.event && (fs.event.type || fs.event.opponent || fs.event.competition || fs.event.date) && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-ink mb-1">Begivenhed</p>
              <p className="text-xs text-muted">
                {[fs.event.type, fs.event.opponent ? `mod ${fs.event.opponent}` : null, fs.event.competition, fs.event.date]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          )}
          {fs.result && (fs.result.final_score || fs.result.outcome || fs.result.placement) && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-ink mb-1">Resultat</p>
              <p className="text-xs text-muted">
                {[fs.result.outcome, fs.result.final_score, fs.result.placement].filter(Boolean).join(", ")}
              </p>
            </div>
          )}
          <FactList heading="Statistik" facts={fs.stats} />
          <FactList heading="Observationer" facts={fs.qualitative} />
          {fs.quotes.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-ink mb-1">Citater</p>
              <ul className="text-xs text-muted list-disc list-inside space-y-0.5">
                {fs.quotes.map((q, i) => (
                  <li key={i}>
                    &ldquo;{q.text}&rdquo;{q.speaker ? ` — ${q.speaker}` : ""}
                    <SourceTag source={q.source} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <FactList heading="Andre fakta" facts={fs.other_facts} />
        </>
      )}

      <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-border">
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium hover:underline"
            style={{ color: "#00205B" }}
          >
            Kilde{headline ? `: ${headline}` : ""} ↗
          </a>
        )}
        {fs?.box_score_url && (
          <a
            href={fs.box_score_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium hover:underline"
            style={{ color: "#00205B" }}
          >
            Box score ↗
          </a>
        )}
      </div>
    </aside>
  );
}
