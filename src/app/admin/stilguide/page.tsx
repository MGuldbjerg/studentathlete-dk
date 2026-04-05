import { notFound } from "next/navigation";
import Link from "next/link";
import { validateAdminToken, getStyleCorrections } from "@/lib/admin";
import { StilguideClient } from "./StilguideClient";

export default async function StilguidePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = await validateAdminToken(token ?? null);
  if (!valid) notFound();

  const corrections = await getStyleCorrections();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Stilguide</h1>
          <Link
            href={`/admin?token=${token}`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Tilbage
          </Link>
        </div>

        <p className="text-sm text-muted mb-6">
          Redaktionelle rettelser der automatisk injiceres i system-prompten ved artikelgenerering.
          Systemet lærer af dine rettelser, så de samme fejl ikke gentages.
        </p>

        <StilguideClient initialCorrections={corrections} token={token!} />
      </div>
    </main>
  );
}
