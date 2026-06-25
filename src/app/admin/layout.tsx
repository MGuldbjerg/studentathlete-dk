import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { isAdmin } from "@/lib/admin-auth";

// Central admin-gate: Cloudflare Access-identitet (eller localhost i dev).
// Gælder alle sider under /admin. /api/admin gates separat i hver route-handler.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin(await headers()))) notFound();
  return <>{children}</>;
}
