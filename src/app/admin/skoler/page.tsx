import { notFound } from "next/navigation";
import Link from "next/link";
import { getSchoolsWithAthletes } from "@/lib/admin";
import { SkolerClient } from "./SkolerClient";

export default async function AdminSchoolsPage() {

  const schools = await getSchoolsWithAthletes();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-ink">Skoler</h1>
          <Link
            href={`/admin`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Tilbage
          </Link>
        </div>
        <p className="text-sm text-muted mb-6">
          Skolefarver bruges som baggrund på genererede kampkort. Kun skoler med
          aktive danske atleter vises. Tom primærfarve → sportens standardfarve.
        </p>

        <SkolerClient schools={schools} />
      </div>
    </main>
  );
}
