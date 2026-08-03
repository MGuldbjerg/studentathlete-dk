import Link from "next/link";
import { getMergeCandidates } from "@/lib/admin";
import { DubletterClient } from "./DubletterClient";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminDubletterPage() {
  const candidates = await getMergeCandidates();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-ink">Mulige dubletter</h1>
          <Link href="/admin" className="text-sm text-muted hover:text-ink transition-colors">
            ← Tilbage
          </Link>
        </div>
        <p className="text-sm text-muted mb-6">
          To rækker der <em>kan</em> være samme atlet. Sikre dubletter — hvor begge
          har skolens eget spiller-id i bio-linket — flettes automatisk og havner
          aldrig her; køen er kun tvivlstilfældene. Fletning flytter artikler,
          historier og kilder til den beholdte række, udfylder tomme felter fra den
          anden, og viderestiller den nedlagte adresse. Det kan ikke fortrydes —
          afvis hellere, hvis du er i tvivl.
        </p>

        <DubletterClient candidates={candidates} />
      </div>
    </main>
  );
}
