import { notFound } from "next/navigation";
import { validateAdminToken } from "@/lib/admin";
import { AddAthleteForm } from "./AddAthleteForm";

export default async function AddAthletePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = await validateAdminToken(token ?? null);
  if (!valid) notFound();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-ink mb-6">Tilføj atlet</h1>
        <AddAthleteForm token={token!} />
      </div>
    </main>
  );
}
