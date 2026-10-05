import { notFound } from "next/navigation";
import { getDB } from "@/lib/db";
import { getAnalytics } from "@/lib/analytics";
import { DateRangePicker } from "./DateRangePicker";
import { LineChart, type ChartSeries } from "./LineChart";
import { dashboardChannels, followerSummary, getSocialStats } from "@/lib/social-stats";
import { COUNTRIES } from "@/lib/countries";

// Validated categorical slots 1-2 (dataviz palette, light): fixed per site,
// never by rank, so DK is always blue and UK always orange.
const SITE_COLORS = ["#2a78d6", "#eb6834"];

type Row = Record<string, unknown>;

const PAGE_TYPE_LABELS: Record<string, string> = {
  article: "Artikler",
  athlete: "Atletprofiler",
  school: "Skoler",
  sport: "Sport-sider",
  home: "Forside",
  other: "Andet",
};

const CLICK_KIND_LABELS: Record<string, string> = {
  bio_out: "Officielle bio-links",
  internal: "Interne links",
  search: "Søgninger",
  ad: "Annoncer",
  outbound: "Udgående links",
};

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-paper rounded-lg border border-border p-4">
      <div className="text-3xl font-bold text-ink">{value}</div>
      <div className="text-sm text-muted mt-1">{label}</div>
    </div>
  );
}

function Table({ rows, keyCol, valCol }: { rows: Row[]; keyCol: string; valCol: string }) {
  if (rows.length === 0) {
    return <p className="p-4 text-sm text-muted">Ingen data i dette interval</p>;
  }
  return (
    <>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-2.5">
          <span className="text-sm text-ink truncate max-w-[75%]">
            {String(row[keyCol] ?? "—")}
          </span>
          <span className="text-sm font-semibold text-ink tabular-nums">
            {Number(row[valCol]).toLocaleString("da-DK")}
          </span>
        </div>
      ))}
    </>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: rawFrom, to: rawTo } = await searchParams;


  // Standard: seneste 30 dage
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const today = todayDate.toISOString().split("T")[0];
  const thirtyAgo = new Date(todayDate);
  thirtyAgo.setDate(thirtyAgo.getDate() - 29);
  const defaultFrom = thirtyAgo.toISOString().split("T")[0];

  const from = rawFrom ?? defaultFrom;
  const to = rawTo ?? today;

  const db = await getDB();

  if (!db) {
    return (
      <main className="min-h-screen bg-surface">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-ink mb-4">Statistik</h1>
          <p className="text-muted text-sm">
            Ingen databaseforbindelse — data er kun tilgængeligt i produktion mod Cloudflare D1.
          </p>
        </div>
      </main>
    );
  }

  const sites = Object.keys(COUNTRIES);
  const channels = dashboardChannels(sites);
  const channelLabel = new Map(channels.map((c) => [c.channel, c.label]));
  const [data, social] = await Promise.all([
    getAnalytics(db, from, to),
    getSocialStats(db, from, to, sites, channels.map((c) => c.channel)),
  ]);
  const trendSeries: ChartSeries[] = social.trend.map((s, i) => ({
    key: s.key,
    label: s.key,
    color: SITE_COLORS[i] ?? "#6B6B6B",
    points: s.points,
  }));
  const avgPerDay = Math.round(data.totalViews / data.activeDays);
  const suffix = rawFrom ? "" : " (seneste 30 dage)";

  const byTypeLabelled = data.byType.map((r) => ({
    ...r,
    page_type: PAGE_TYPE_LABELS[r.page_type as string] ?? String(r.page_type),
  }));
  const clicksLabelled = data.clicksByKind.map((r) => ({
    ...r,
    click_kind: CLICK_KIND_LABELS[r.click_kind as string] ?? String(r.click_kind),
  }));
  const totalClicks = data.clicksByKind.reduce((s, r) => s + Number(r.clicks ?? 0), 0);

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Statistik</h1>
          <a
            href={`/admin`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Admin
          </a>
        </div>

        {/* Datointerval-vælger */}
        <div className="bg-paper rounded-lg border border-border p-4 mb-6">
          <DateRangePicker currentFrom={from} currentTo={to} />
        </div>

        {/* Nøgletal */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            value={data.uniqueVisitors.toLocaleString("da-DK")}
            label={`Unikke besøgende${suffix}`}
          />
          <StatCard
            value={data.totalViews.toLocaleString("da-DK")}
            label="Sidevisninger"
          />
          <StatCard
            value={avgPerDay.toLocaleString("da-DK")}
            label="Gns. pr. dag"
          />
        </div>

        {/* Udvikling pr. site */}
        <section className="mb-6">
          <h2 className="text-base font-bold text-ink mb-1">Sidevisninger pr. dag</h2>
          <p className="text-xs text-muted mb-3">
            Hvilket site besøget landede på.
            {social.unknownSiteViews > 0 &&
              ` ${social.unknownSiteViews.toLocaleString("da-DK")} ældre visninger kunne ikke placeres på et site og er udeladt.`}
          </p>
          <div className="bg-paper rounded-lg border border-border">
            <LineChart series={trendSeries} />
          </div>
        </section>

        {/* Følgere */}
        <section className="mb-6">
          <h2 className="text-base font-bold text-ink mb-1">Følgere</h2>
          <p className="text-xs text-muted mb-3">
            Målt én gang i døgnet (05:50 UTC). Ændringen er fra første til sidste måling i intervallet.
          </p>
          {social.followers.length === 0 ? (
            <div className="bg-paper rounded-lg border border-border">
              <p className="p-4 text-sm text-muted">Ingen målinger endnu — første måling kommer i morgen tidlig.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {social.followers.map((s) => {
                const sum = followerSummary(s);
                const label = channelLabel.get(s.key) ?? s.key;
                return (
                  <div key={s.key} className="bg-paper rounded-lg border border-border">
                    <div className="px-4 pt-3">
                      <div className="text-sm text-muted">{label}</div>
                      <div className="text-2xl font-bold text-ink tabular-nums">
                        {sum.last.toLocaleString("da-DK")}
                        <span className="text-sm font-normal text-muted ml-2">
                          {sum.change >= 0 ? "+" : "−"}
                          {Math.abs(sum.change).toLocaleString("da-DK")}
                        </span>
                      </div>
                    </div>
                    <LineChart series={[{ key: s.key, label, color: SITE_COLORS[0], points: s.points }]} height={120} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sociale medier → sitet */}
        <section className="mb-6">
          <h2 className="text-base font-bold text-ink mb-1">Sociale medier → sitet</h2>
          <p className="text-xs text-muted mb-3">
            Opslag sendt i intervallet og de besøg, opslagenes mærkede links gav (<code>?kilde=</code>/<code>?source=</code>,
            fra 5. oktober 2026). Kun besøgende der har accepteret cookies tælles, så tallene er et minimum.
          </p>
          <div className="bg-paper rounded-lg border border-border">
            {social.funnel.length === 0 ? (
              <p className="p-4 text-sm text-muted">Ingen opslag eller mærkede besøg i dette interval</p>
            ) : (
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-muted">
                    <th className="text-left font-semibold px-4 py-2.5">Kanal</th>
                    <th className="text-right font-semibold px-4 py-2.5">Opslag</th>
                    <th className="text-right font-semibold px-4 py-2.5">Besøg</th>
                    <th className="text-right font-semibold px-4 py-2.5">Besøg pr. opslag</th>
                  </tr>
                </thead>
                <tbody>
                  {social.funnel.map((r) => (
                    <tr key={r.channel} className="border-t border-border text-ink">
                      <td className="px-4 py-2.5">{channelLabel.get(r.channel) ?? r.channel}</td>
                      <td className="px-4 py-2.5 text-right">{r.posts.toLocaleString("da-DK")}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{r.visits.toLocaleString("da-DK")}</td>
                      <td className="px-4 py-2.5 text-right">{r.perPost === null ? "—" : r.perPost.toLocaleString("da-DK")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold text-muted mb-2">Artikler der fik flest læsere fra sociale medier</h3>
              <div className="bg-paper rounded-lg border border-border divide-y divide-border">
                {social.topPosts.length === 0 ? (
                  <p className="p-4 text-sm text-muted">Ingen endnu</p>
                ) : (
                  social.topPosts.map((r) => (
                    <div key={`${r.channel}${r.path}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="text-sm text-ink truncate">
                        {r.title ?? r.path}
                        <span className="block text-xs text-muted">{channelLabel.get(r.channel) ?? r.channel}</span>
                      </span>
                      <span className="text-sm font-semibold text-ink tabular-nums">{r.visits.toLocaleString("da-DK")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted mb-2">Sociale henvisninger uden mærke</h3>
              <div className="bg-paper rounded-lg border border-border divide-y divide-border">
                <Table rows={social.untaggedSocial} keyCol="referrer" valCol="views" />
              </div>
              <p className="text-xs text-muted mt-2">
                Fra før links blev mærket, eller delt videre af andre. Apps sender ofte ingen henvisning, så det er langt fra alle.
              </p>
            </div>
          </div>
        </section>

        {/* Top sider */}
        <section className="mb-6">
          <h2 className="text-base font-bold text-ink mb-3">Top sider</h2>
          <div className="bg-paper rounded-lg border border-border divide-y divide-border">
            <Table rows={data.topPages} keyCol="path" valCol="views" />
          </div>
        </section>

        {/* Sidetype + sport */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <section>
            <h2 className="text-base font-bold text-ink mb-3">Sidetype</h2>
            <div className="bg-paper rounded-lg border border-border divide-y divide-border">
              <Table rows={byTypeLabelled} keyCol="page_type" valCol="views" />
            </div>
          </section>
          <section>
            <h2 className="text-base font-bold text-ink mb-3">Sport</h2>
            <div className="bg-paper rounded-lg border border-border divide-y divide-border">
              <Table rows={data.bySport} keyCol="sport" valCol="views" />
            </div>
          </section>
        </div>

        {/* Enhed + lande */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <section>
            <h2 className="text-base font-bold text-ink mb-3">Enhed</h2>
            <div className="bg-paper rounded-lg border border-border divide-y divide-border">
              <Table rows={data.byDevice} keyCol="device_type" valCol="views" />
            </div>
          </section>
          <section>
            <h2 className="text-base font-bold text-ink mb-3">Lande (top 5)</h2>
            <div className="bg-paper rounded-lg border border-border divide-y divide-border">
              <Table rows={data.byCountry} keyCol="country" valCol="views" />
            </div>
          </section>
        </div>

        {/* Trafikkilde — kun ankomster med ?kilde= eller utm_source */}
        <section>
          <h2 className="text-base font-bold text-ink mb-1">Kilder</h2>
          <p className="text-xs text-muted mb-3">
            Ankomster på mærkede links, fx Instagram-bio&apos;en (<code>?kilde=ig</code>). Besøg uden
            mærke tælles ikke med her.
          </p>
          <div className="bg-paper rounded-lg border border-border divide-y divide-border">
            <Table rows={data.bySource} keyCol="source" valCol="views" />
          </div>
        </section>

        {/* Klik */}
        <section>
          <h2 className="text-base font-bold text-ink mb-3">
            Klik <span className="text-sm font-normal text-muted">({totalClicks.toLocaleString("da-DK")})</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-muted mb-2">Efter type</h3>
              <div className="bg-paper rounded-lg border border-border divide-y divide-border">
                <Table rows={clicksLabelled} keyCol="click_kind" valCol="clicks" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted mb-2">Mest klikkede mål</h3>
              <div className="bg-paper rounded-lg border border-border divide-y divide-border">
                <Table rows={data.topClickTargets} keyCol="click_target" valCol="clicks" />
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
