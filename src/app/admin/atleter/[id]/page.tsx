import { notFound } from "next/navigation";
import Link from "next/link";
import { validateAdminToken, getAthleteById } from "@/lib/admin";
import { getAthleteEvents } from "@/lib/db";
import { EditAthleteForm } from "./EditAthleteForm";
import { AthleteEventsEditor } from "./AthleteEventsEditor";

export default async function EditAthletePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ id: idStr }, { token }] = await Promise.all([params, searchParams]);
  const valid = await validateAdminToken(token ?? null);
  if (!valid) notFound();

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
              {athlete.university} · {athlete.sport}
            </p>
          </div>
          <Link
            href={`/admin/atleter?token=${token}`}
            className="text-sm text-muted hover:text-ink"
          >
            ← Tilbage
          </Link>
        </div>

        <EditAthleteForm athlete={athlete} token={token!} />
        <AthleteEventsEditor athleteId={id} token={token!} events={events} />
      </div>
    </main>
  );
}
