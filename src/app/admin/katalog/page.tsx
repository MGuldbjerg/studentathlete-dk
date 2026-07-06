import Link from "next/link";
import {
  getCatalogueCounts,
  type CatalogueCount,
  type CatalogueCountryRow,
} from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Admin → Katalog: ekspansions-kataloget (international_athletes) opsummeret pr.
 * sprog / region / land / sportsgren. Walled-off tabel — ingen offentlig side
 * læser den. Beslutnings-input til pool-vs-eget-site-træet (jf. expansion-playbook.md)
 * OG til hvor man leder efter frivillige/kontraktører (sport pr. marked).
 * Opdateres af det ugentlige catalogue-job.
 */

// Vejledende tærskel fra beslutningstræet: et land der KLART er over ~200 atleter
// (+ en dedikeret lokal redaktør) er eget-site-kandidat; ellers poolet. Rå tal.
const OWN_SITE_THRESHOLD = 200;

const NAVY = "#00205B";

function BarRow({
  label,
  n,
  max,
  right,
  caption,
}: {
  label: React.ReactNode;
  n: number;
  max: number;
  right?: React.ReactNode;
  caption?: React.ReactNode;
}) {
  const pct = max > 0 ? Math.max(2, Math.round((n / max) * 100)) : 0;
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-3">
        <div className="w-40 flex-shrink-0 text-sm text-ink truncate">{label}</div>
        <div className="flex-1 h-4 rounded bg-surface overflow-hidden">
          <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: NAVY }} />
        </div>
        <div className="w-10 flex-shrink-0 text-right text-sm font-semibold text-ink tabular-nums">
          {n}
        </div>
        {right !== undefined && <div className="w-32 flex-shrink-0 text-right">{right}</div>}
      </div>
      {caption !== undefined && (
        <div className="ml-40 pl-3 text-xs text-muted mt-0.5">{caption}</div>
      )}
    </div>
  );
}

export default async function AdminCataloguePage() {
  const data = await getCatalogueCounts();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/admin" className="text-sm text-muted hover:text-ink">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold text-ink mt-2 mb-1">Ekspansions-katalog</h1>

        {!data || data.total === 0 ? (
          <p className="text-muted text-sm mt-4">
            Kataloget er tomt. Det ugentlige <code>catalogue</code>-job (søndag) fylder
            tabellen <code>international_athletes</code> — eller kør den manuelt via
            workflow-dispatch.
          </p>
        ) : (
          <>
            <p className="text-muted text-sm mb-1">
              {data.total.toLocaleString("da-DK")} internationale NCAA-atleter i alt ·{" "}
              {data.byCountry.length} lande
              {data.lastUpdated ? ` · sidst opdateret ${data.lastUpdated.slice(0, 10)}` : ""}
            </p>
            <p className="text-muted text-xs mb-6">
              Rå observerede atleter fra den ugentlige scraping (ikke skalerede estimater).
              Ingen offentlig side læser tabellen — det er ekspansions-prep. Tærskel for
              eget-site-kandidat: ≥ {OWN_SITE_THRESHOLD} (vejledende).
            </p>

            <Section
              title="Pr. sprog"
              hint="Redaktionel enhed — én redaktør pr. sprog. »English« spænder flere regioner. Undertekst = top-sportsgrene (hvor frivillige findes)."
              rows={data.byLanguage}
              captions={data.topSportByLanguage}
            />

            <Section
              title="Pr. region"
              hint="Pool-markedsenhed. Store lande graduerer til eget site; små naboer poolet. Undertekst = top-sportsgrene pr. marked."
              rows={data.byRegion}
              captions={data.topSportByRegion}
            />

            <Section
              title="Pr. sportsgren"
              hint="Hvor man leder efter frivillige/kontraktører — klub- og forbundsmiljøer er sports-specifikke."
              rows={data.bySport}
            />

            <CountrySection rows={data.byCountry} />
          </>
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  hint,
  rows,
  captions,
}: {
  title: string;
  hint: string;
  rows: CatalogueCount[];
  captions?: Record<string, string>;
}) {
  const max = rows[0]?.n ?? 0;
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-ink mb-0.5">{title}</h2>
      <p className="text-muted text-xs mb-3">{hint}</p>
      <div className="bg-paper rounded-lg border border-border px-4 py-2">
        {rows.map((r) => (
          <BarRow key={r.name} label={r.name} n={r.n} max={max} caption={captions?.[r.name]} />
        ))}
      </div>
    </section>
  );
}

function CountrySection({ rows }: { rows: CatalogueCountryRow[] }) {
  const max = rows[0]?.n ?? 0;
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-ink mb-0.5">Pr. land</h2>
      <p className="text-muted text-xs mb-3">
        Graduerings-input: land-størrelse vs. dets pool (regionen). ★ = eget-site-kandidat
        (≥ {OWN_SITE_THRESHOLD}).
      </p>
      <div className="bg-paper rounded-lg border border-border px-4 py-2">
        {rows.map((r) => (
          <BarRow
            key={r.name}
            label={
              <span className="flex items-center gap-1.5">
                {r.n >= OWN_SITE_THRESHOLD && (
                  <span title="Eget-site-kandidat" style={{ color: NAVY }}>
                    ★
                  </span>
                )}
                {r.name}
              </span>
            }
            n={r.n}
            max={max}
            right={
              <span className="text-xs text-muted truncate">
                {r.language} · {r.region}
              </span>
            }
          />
        ))}
      </div>
    </section>
  );
}
