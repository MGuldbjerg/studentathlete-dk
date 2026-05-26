import { notFound } from "next/navigation";
import { validateAdminToken } from "@/lib/admin";
import { getDB } from "@/lib/db";
import { DateRangePicker } from "./DateRangePicker";

type Row = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function q(db: any, sql: string, params: (string | number)[]): Promise<Row[]> {
  try {
    const r = await db.prepare(sql).bind(...params).all();
    return (r.results ?? []) as Row[];
  } catch {
    return [];
  }
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  article: "Artikler",
  athlete: "Atletprofiler",
  school: "Skoler",
  sport: "Sport-sider",
  home: "Forside",
  other: "Andet",
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
  searchParams: Promise<{ token?: string; from?: string; to?: string }>;
}) {
  const { token, from: rawFrom, to: rawTo } = await searchParams;

  const valid = await validateAdminToken(token ?? null);
  if (!valid) notFound();

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

  // Alle queries parallelt
  const [totals, topPages, byType, bySport, byDevice, byCountry] = await Promise.all([
    q(db,
      `SELECT COUNT(*) as total, COUNT(DISTINCT DATE(created_at)) as days
       FROM pageviews WHERE DATE(created_at) BETWEEN ? AND ?`,
      [from, to]
    ),
    q(db,
      `SELECT path, COUNT(*) as views
       FROM pageviews WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY path ORDER BY views DESC LIMIT 10`,
      [from, to]
    ),
    q(db,
      `SELECT page_type, COUNT(*) as views
       FROM pageviews WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY page_type ORDER BY views DESC`,
      [from, to]
    ),
    q(db,
      `SELECT sport, COUNT(*) as views
       FROM pageviews
       WHERE sport IS NOT NULL AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY sport ORDER BY views DESC`,
      [from, to]
    ),
    q(db,
      `SELECT device_type, COUNT(*) as views
       FROM pageviews WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY device_type ORDER BY views DESC`,
      [from, to]
    ),
    q(db,
      `SELECT COALESCE(country, 'Ukendt') as country, COUNT(*) as views
       FROM pageviews WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY country ORDER BY views DESC LIMIT 5`,
      [from, to]
    ),
  ]);

  const total = Number(totals[0]?.total ?? 0);
  const activeDays = Math.max(Number(totals[0]?.days ?? 1), 1);
  const avgPerDay = Math.round(total / activeDays);

  // Omsæt page_type-labels
  const byTypeLabelled = byType.map((r) => ({
    ...r,
    page_type: PAGE_TYPE_LABELS[r.page_type as string] ?? String(r.page_type),
  }));

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Statistik</h1>
          <a
            href={`/admin?token=${token}`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Admin
          </a>
        </div>

        {/* Datointerval-vælger */}
        <div className="bg-paper rounded-lg border border-border p-4 mb-6">
          <DateRangePicker token={token ?? ""} currentFrom={from} currentTo={to} />
        </div>

        {/* Nøgletal */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard
            value={total.toLocaleString("da-DK")}
            label={`Sidevisninger${rawFrom ? "" : " (seneste 30 dage)"}`}
          />
          <StatCard
            value={avgPerDay.toLocaleString("da-DK")}
            label="Gns. sidevisninger pr. dag"
          />
        </div>

        {/* Top sider */}
        <section className="mb-6">
          <h2 className="text-base font-bold text-ink mb-3">Top sider</h2>
          <div className="bg-paper rounded-lg border border-border divide-y divide-border">
            <Table rows={topPages} keyCol="path" valCol="views" />
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
              <Table rows={bySport} keyCol="sport" valCol="views" />
            </div>
          </section>
        </div>

        {/* Enhed + lande */}
        <div className="grid grid-cols-2 gap-4">
          <section>
            <h2 className="text-base font-bold text-ink mb-3">Enhed</h2>
            <div className="bg-paper rounded-lg border border-border divide-y divide-border">
              <Table rows={byDevice} keyCol="device_type" valCol="views" />
            </div>
          </section>
          <section>
            <h2 className="text-base font-bold text-ink mb-3">Lande (top 5)</h2>
            <div className="bg-paper rounded-lg border border-border divide-y divide-border">
              <Table rows={byCountry} keyCol="country" valCol="views" />
            </div>
          </section>
        </div>

      </div>
    </main>
  );
}
