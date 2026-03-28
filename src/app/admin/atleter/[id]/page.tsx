import { notFound } from "next/navigation";
import Link from "next/link";
import { validateAdminToken, getAthleteById } from "@/lib/admin";
import { EditAthleteForm } from "./EditAthleteForm";

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

  const athlete = await getAthleteById(id);
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
      </div>
    </main>
  );
}
