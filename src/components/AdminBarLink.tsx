import Link from "next/link";
import { headers } from "next/headers";
import { isAdmin } from "@/lib/admin-auth";

/**
 * Permanent "Admin"-knap i topbaren — vises KUN for en indlogget admin
 * (Cloudflare Access-cookie verificeret server-side). Null for alle andre.
 */
export async function AdminBarLink() {
  if (!(await isAdmin(await headers()))) return null;
  return (
    <Link
      href="/admin"
      className="flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/25 transition-colors whitespace-nowrap"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
      Admin
    </Link>
  );
}
