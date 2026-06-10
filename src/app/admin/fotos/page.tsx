import { notFound } from "next/navigation";
import Link from "next/link";
import { validateAdminToken, getPendingPhotoSuggestions } from "@/lib/admin";
import { FotosClient } from "./FotosClient";

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = await validateAdminToken(token ?? null);
  if (!valid) notFound();

  const suggestions = await getPendingPhotoSuggestions();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-ink">Foto-forslag</h1>
          <Link
            href={`/admin?token=${token}`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Tilbage
          </Link>
        </div>
        <p className="text-sm text-muted mb-6">
          Headshots fundet på atletens officielle bio-side — identiteten er sikker,
          men tjek at billedet ser rigtigt ud, og at krediteringen er korrekt, før
          du godkender. Godkendelse sætter fotoet på atletprofilen.
        </p>

        <FotosClient suggestions={suggestions} token={token!} />
      </div>
    </main>
  );
}
