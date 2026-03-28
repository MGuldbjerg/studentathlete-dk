import { notFound } from "next/navigation";
import Link from "next/link";
import { validateAdminToken, getPipelineStats } from "@/lib/admin";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-paper rounded-lg border border-border p-4">
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    running: "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
    success: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    js_required: "bg-purple-100 text-purple-800",
    empty: "bg-gray-100 text-gray-600",
    new: "bg-blue-100 text-blue-800",
    drafted: "bg-yellow-100 text-yellow-800",
    published: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 rounded ${colors[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = await validateAdminToken(token ?? null);
  if (!valid) notFound();

  const stats = await getPipelineStats();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Pipeline-overblik</h1>
          <Link
            href={`/admin?token=${token}`}
            className="text-sm text-muted hover:text-ink"
          >
            Tilbage
          </Link>
        </div>

        {!stats ? (
          <p className="text-muted">Kunne ikke hente statistik.</p>
        ) : (
          <>
            {/* Overordnede tal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatCard label="Skoler i alt" value={stats.schools.total} />
              <StatCard label="Med website" value={stats.schools.withUrl} />
              <StatCard label="Aktive atleter" value={stats.athletes.active} />
              <StatCard label="Historier" value={stats.stories.total} />
            </div>

            {/* Skoler per division */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-ink mb-3">Skoler per division</h2>
              <div className="bg-paper rounded-lg border border-border overflow-hidden">
                {stats.schools.byDivision.map((row) => (
                  <div
                    key={row.key}
                    className="flex justify-between px-4 py-2 border-b border-border last:border-b-0"
                  >
                    <span className="text-sm text-ink">{row.key}</span>
                    <span className="text-sm font-medium text-ink">{row.count}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Roster-checks */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-ink mb-3">Roster-checks</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <StatCard label="Total" value={stats.rosterChecks.total} />
                <StatCard label="Afventer" value={stats.rosterChecks.pending} />
              </div>
              <div className="bg-paper rounded-lg border border-border overflow-hidden">
                {stats.rosterChecks.byStatus.map((row) => (
                  <div
                    key={row.key}
                    className="flex justify-between items-center px-4 py-2 border-b border-border last:border-b-0"
                  >
                    <StatusBadge status={row.key} />
                    <span className="text-sm font-medium text-ink">{row.count}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Atleter per sport */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-ink mb-3">
                Atleter per sport ({stats.athletes.total} i alt)
              </h2>
              <div className="bg-paper rounded-lg border border-border overflow-hidden">
                {stats.athletes.bySport.map((row) => (
                  <div
                    key={row.key}
                    className="flex justify-between px-4 py-2 border-b border-border last:border-b-0"
                  >
                    <span className="text-sm text-ink">{row.key}</span>
                    <span className="text-sm font-medium text-ink">{row.count}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Historier */}
            {stats.stories.byStatus.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-ink mb-3">Historier per status</h2>
                <div className="bg-paper rounded-lg border border-border overflow-hidden">
                  {stats.stories.byStatus.map((row) => (
                    <div
                      key={row.key}
                      className="flex justify-between items-center px-4 py-2 border-b border-border last:border-b-0"
                    >
                      <StatusBadge status={row.key} />
                      <span className="text-sm font-medium text-ink">{row.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Seneste pipeline-kørsler */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-ink mb-3">Seneste kørsler</h2>
              {stats.recentRuns.length === 0 ? (
                <p className="text-sm text-muted">Ingen kørsler registreret.</p>
              ) : (
                <div className="bg-paper rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th className="px-4 py-2 font-medium">Tidspunkt</th>
                        <th className="px-4 py-2 font-medium">Type</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 font-medium text-right">Behandlet</th>
                        <th className="px-4 py-2 font-medium text-right">Fundet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentRuns.map((run, i) => (
                        <tr
                          key={i}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="px-4 py-2 text-muted whitespace-nowrap">
                            {new Date(run.started_at).toLocaleString("da-DK", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-2 text-ink">{run.run_type}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={run.status} />
                          </td>
                          <td className="px-4 py-2 text-right text-ink">
                            {run.items_processed}
                          </td>
                          <td className="px-4 py-2 text-right text-ink">
                            {run.items_found}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
