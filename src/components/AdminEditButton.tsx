import Link from "next/link";
import { headers } from "next/headers";
import { isAdmin } from "@/lib/admin-auth";

/**
 * Flydende blyant-genvej på offentlige sider — vises KUN for en indlogget admin
 * (Cloudflare Access-cookie verificeret server-side). Linker til den relevante
 * /admin-redigeringsside. Returnerer null for almindelige besøgende.
 */
export async function AdminEditButton({
  href,
  label = "Rediger",
}: {
  href: string;
  label?: string;
}) {
  if (!(await isAdmin(await headers()))) return null;
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
      style={{ backgroundColor: "#00205B" }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
      {label}
    </Link>
  );
}
