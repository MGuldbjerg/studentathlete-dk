import Link from "next/link";
import {
  getQueues, getAskedSchools, getUnclearedAthletes, getManualIssues,
  nonEmptyQueues, STALE_REPLY_DAYS,
} from "@/lib/admin-issues";
import { SagerClient } from "./SagerClient";

/**
 * Admin → Åbne sager: everything waiting on Mikkel on one page, so a free half hour
 * starts with a list instead of a search. Queues and the photo ledger are counted
 * live; the hand-kept list (admin_issues) covers what no query can see.
 */
export default async function AdminSagerPage() {
  const [queues, asked, uncleared, manual] = await Promise.all([
    getQueues(), getAskedSchools(), getUnclearedAthletes(), getManualIssues(),
  ]);
  const activeQueues = nonEmptyQueues(queues);
  const stale = asked.filter((s) => (s.days ?? 0) >= STALE_REPLY_DAYS).length;
  const unclearedBySchool = new Map<string, string[]>();
  for (const a of uncleared) {
    unclearedBySchool.set(a.school, [...(unclearedBySchool.get(a.school) ?? []), `${a.name} (${a.sport})`]);
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/admin" className="text-sm text-muted hover:text-ink">← Admin</Link>
        <h1 className="text-2xl font-bold text-ink mt-2 mb-1">Åbne sager</h1>
        <p className="text-muted text-sm mb-6">
          Alt der venter på dig. Køerne og fototilladelserne tælles live; listen nederst
          fører du selv.
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-ink mb-2">Mine sager ({manual.open.length})</h2>
          <SagerClient open={manual.open} done={manual.done} />
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-ink mb-2">Køer</h2>
          {activeQueues.length === 0 ? (
            <p className="text-muted text-sm">Alle køer er tomme.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {activeQueues.map((q) => (
                <Link key={q.key} href={q.href}
                  className="flex items-center justify-between bg-paper rounded-lg border border-border px-4 py-3 hover:border-ink">
                  <span className="text-ink font-semibold">{q.label}</span>
                  <span className="text-sm font-bold text-ink">{q.count} →</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-ink mb-1">Fototilladelser uden svar ({asked.length})</h2>
          <p className="text-muted text-sm mb-3">
            {stale > 0 ? `${stale} har ventet ${STALE_REPLY_DAYS}+ dage. ` : ""}
            Der sendes ingen automatiske rykkere. Registrér svar med{" "}
            <code>request-permission.ts --respond</code>.
          </p>
          {asked.length > 0 && (
            <div className="bg-paper rounded-lg border border-border divide-y divide-border">
              {asked.map((s) => {
                const old = (s.days ?? 0) >= STALE_REPLY_DAYS;
                return (
                  <div key={s.id} className="px-4 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-ink font-semibold">{s.name}</span>
                      <span className="text-muted">· {s.conference ?? "ukendt konference"}</span>
                      <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded"
                        style={old ? { backgroundColor: "#fde68a", color: "#92400e" } : { color: "var(--color-muted)" }}>
                        {s.days === null ? "?" : `${s.days} d`}
                      </span>
                    </div>
                    {s.note && <p className="text-xs text-muted mt-0.5">{s.note}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {unclearedBySchool.size > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-ink mb-1">Atleter uden navnegodkendelse ({uncleared.length})</h2>
            <p className="text-muted text-sm mb-3">
              Skolen godkender kun navngivne atleter, så disse vises uden foto. Skriv til skolen
              og kør <code>request-permission.ts --clear</code>.
            </p>
            <div className="bg-paper rounded-lg border border-border divide-y divide-border">
              {[...unclearedBySchool].map(([school, names]) => (
                <div key={school} className="px-4 py-2 text-sm">
                  <span className="text-ink font-semibold">{school}</span>
                  <p className="text-muted text-xs mt-0.5">{names.join(", ")}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
