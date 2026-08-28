import Link from "next/link";
import { getSiteSettings } from "@/lib/admin";
import { t } from "@/lib/i18n";
import { currentLanguage } from "@/lib/site-server";

/**
 * Ai-ansvarsfraskrivelse der vises i bunden af hver artikel.
 * Tekst redigeres i admin → Tekster & indstillinger (disclaimer.ai).
 */
export async function AiDisclaimer() {
  const [settings, lang] = await Promise.all([getSiteSettings(), currentLanguage()]);
  return (
    <aside
      className="mt-8 px-5 py-4 border-l-[3px] bg-surface/50 text-sm text-muted leading-relaxed"
      style={{ borderLeftColor: "#BF0A30" }}
    >
      {settings["disclaimer.ai"]}{" "}
      <Link
        href="/ai-brug"
        className="text-ink hover:underline decoration-flag-red"
      >
        {t("footer.ai_use", lang)}
      </Link>
      .
    </aside>
  );
}
