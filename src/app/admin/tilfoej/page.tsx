import { notFound } from "next/navigation";
import Link from "next/link";
import { AddAthleteForm } from "./AddAthleteForm";

export default async function AddAthletePage() {

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Tilføj atlet</h1>
          <Link
            href={`/admin`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Tilbage
          </Link>
        </div>
        <AddAthleteForm />
      </div>
    </main>
  );
}
