import Link from "next/link";
import { t } from "@/lib/i18n";
import { currentLanguage } from "@/lib/site-server";

export default async function NotFound() {
  const lang = await currentLanguage();
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p
          className="text-6xl font-bold mb-2"
          style={{ fontFamily: "var(--font-serif)", color: "#BF0A30" }}
        >
          404
        </p>
        <h1
          className="text-2xl font-bold mb-4"
          style={{ fontFamily: "var(--font-serif)", color: "#00205B" }}
        >
          {t("notfound.title", lang)}
        </h1>
        <p className="text-[var(--color-muted)] mb-6">
          {t("notfound.body", lang)}
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: "#00205B" }}
        >
          {t("notfound.cta", lang)}
        </Link>
      </div>
    </main>
  );
}
