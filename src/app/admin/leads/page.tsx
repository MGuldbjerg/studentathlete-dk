import Link from "next/link";
import { getLeads } from "@/lib/admin";
import { LeadsClient } from "./LeadsClient";

/**
 * Admin → Leads: henvendelser fra /spil-i-usa-formularen med attribution
 * (source_path + referrer). Status-flowet (ny → kontaktet → videresendt →
 * lukket) er afregningsgrundlaget for et fremtidigt NSSA-samarbejde.
 */
export default async function AdminLeadsPage() {
  const leads = await getLeads();
  const newCount = leads.filter((l) => l.status === "new").length;

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/admin" className="text-sm text-muted hover:text-ink">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold text-ink mt-2 mb-1">Leads</h1>
        <p className="text-muted text-sm mb-6">
          {leads.length} henvendelse{leads.length === 1 ? "" : "r"}
          {newCount > 0 ? ` · ${newCount} ny${newCount === 1 ? "" : "e"}` : ""} — fra
          Spil i USA-formularen (pt. offline). Hver række har attribution (side +
          referrer), så et partnersamarbejde kan afregnes pr. dokumenteret lead.
        </p>
        <LeadsClient leads={leads} />
      </div>
    </main>
  );
}
