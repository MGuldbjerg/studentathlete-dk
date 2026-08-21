import { notFound } from "next/navigation";
import Link from "next/link";
import { getAthleteById } from "@/lib/admin";
import { getAthleteEvents } from "@/lib/db";
import { EditAthleteForm } from "./EditAthleteForm";
import { AthleteEventsEditor } from "./AthleteEventsEditor";

import { ADMIN_LANG, sportLabel } from "@/lib/i18n";
export default async function EditAthletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;

  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const [athlete, events] = await Promise.all([getAthleteById(id), getAthleteEvents(id)]);
  if (!athlete) notFound();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-ink">{athlete.name}</h1>
            <p className="text-muted text-sm">
              {athlete.university} · {sportLabel(athlete.sport, ADMIN_LANG)}
            </p>
          </div>
          <Link
            href={`/admin/atleter`}
            className="text-sm text-muted hover:text-ink"
          >
            ← Tilbage
          </Link>
        </div>

        <EditAthleteForm athlete={athlete} />
        <AthleteEventsEditor athleteId={id} events={events} />
      </div>
    </main>
  );
}
