import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { isAdmin } from "@/lib/admin-auth";
import { contentCountry } from "@/lib/site-server";
import { COUNTRIES } from "@/lib/countries";
import { CountryPicker } from "@/components/admin/CountryPicker";

// Central admin-gate: Cloudflare Access-identitet (eller localhost i dev).
// Gælder alle sider under /admin. /api/admin gates separat i hver route-handler.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin(await headers()))) notFound();

  // Admin bor kun på standardsitet, så landet kan ikke aflæses af værten. Det
  // vælges her og følger med hver eneste query via `contentCountry()`.
  const active = await contentCountry();
  const countries = Object.values(COUNTRIES).map((c) => ({ code: c.code, brand: c.brand }));

  return (
    <>
      <CountryPicker countries={countries} active={active} />
      {children}
    </>
  );
}
