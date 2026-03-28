import { notFound } from "next/navigation";
import Link from "next/link";
import { validateAdminToken } from "@/lib/admin";
import { getAllAthletes, getAlumniAthletes } from "@/lib/db";
import { getSportColor } from "@/lib/types";

export default async function AdminAthletesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = await validateAdminToken(token ?? null);
  if (!valid) notFound();

  const [active, alumni] = await Promise.all([
    getAllAthletes(),
    getAlumniAthletes(),
  ]);
  const all = [...active, ...alumni];

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">Atleter</h1>
            <p className="text-muted text-sm">
              {all.length} atleter · tryk for at redigere
            </p>
          </div>
          <Link
            href={`/admin?token=${token}`}
            className="text-sm text-muted hover:text-ink"
          >
            ← Kladder
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          {all.map((athlete) => {
            const hasPhoto = !!athlete.photo_url;
            return (
              <Link
                key={athlete.id}
                href={`/admin/atleter/${athlete.id}?token=${token}`}
                className="flex items-center gap-3 p-3 bg-paper rounded-lg border border-border
                           active:scale-[0.98] transition-transform"
              >
                {/* Foto-indikator */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center
                             text-xs font-bold text-white flex-shrink-0"
                  style={{
                    backgroundColor: hasPhoto ? getSportColor(athlete.sport) : "#ccc",
                  }}
                >
                  {hasPhoto ? "✓" : athlete.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">
                    {athlete.name}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {athlete.university} · {athlete.sport}
                    {!athlete.active ? " · Alumni" : ""}
                  </p>
                </div>

                {/* Foto-status */}
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  hasPhoto
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {hasPhoto ? "Foto" : "Intet foto"}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
