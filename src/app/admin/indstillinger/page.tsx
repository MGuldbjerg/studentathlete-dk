import Link from "next/link";
import { getSiteSettings } from "@/lib/admin";
import { SITE_CONTENT } from "@/lib/site-content";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const values = await getSiteSettings();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Tekster &amp; indstillinger</h1>
          <Link href={`/admin`} className="text-sm text-muted hover:text-ink transition-colors">
            ← Tilbage
          </Link>
        </div>
        <p className="text-sm text-muted mb-6">
          Rediger faste tekster på sitet. Ændringer er live med det samme — ingen udgivelse nødvendig.
        </p>
        <SettingsForm fields={SITE_CONTENT} values={values} />
      </div>
    </main>
  );
}
