import Link from "next/link";
import { getInstagramCandidates } from "@/lib/admin";
import { InstagramClient } from "./InstagramClient";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminInstagramPage() {
  const candidates = await getInstagramCandidates();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-ink">Instagram</h1>
          <Link href="/admin" className="text-sm text-muted hover:text-ink transition-colors">
            ← Tilbage
          </Link>
        </div>
        <p className="text-sm text-muted mb-6">
          Atleter der selv har lagt deres Instagram på skolens bio-side. Følgningen
          kan ikke automatiseres — Meta har intet følge-endpoint, og et script der
          klikker for os ville sætte @studentathlete.dk på spil, altså den konto
          opslagene går ud fra. Til gengæld er søgningen klaret: listen er dem der
          faktisk har en handle, så et klik pr. atlet er alt der er tilbage.
        </p>

        <InstagramClient candidates={candidates} />
      </div>
    </main>
  );
}
