import Link from "next/link";
import { getPendingProfileDrafts, getEventsForAthletes, type ProfileDraftEvent } from "@/lib/admin";
import { ProfilerClient } from "./ProfilerClient";

export default async function AdminProfilerPage() {
  const drafts = await getPendingProfileDrafts();
  const eventsMap = await getEventsForAthletes(drafts.map((d) => d.id));

  // Map → plain object (props til client component skal kunne serialiseres)
  const events: Record<number, ProfileDraftEvent[]> = {};
  for (const [id, evs] of eventsMap) events[id] = evs;

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-ink">Profiludkast</h1>
          <Link
            href={`/admin`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Tilbage
          </Link>
        </div>
        <p className="text-sm text-muted mb-6">
          Udkast til &quot;Om atleten&quot;-teksten på atletprofilen. Basis-udkast er
          bygget regelbaseret af roster-fakta; udvidede udkast er skrevet af LLM
          ud fra vores egne kildebelagte begivenheder (vist under teksten — tjek
          at alt i udkastet har belæg). Teksten kan redigeres før godkendelse.
          Intet vises på sitet før du godkender.
        </p>

        <ProfilerClient drafts={drafts} events={events} />
      </div>
    </main>
  );
}
