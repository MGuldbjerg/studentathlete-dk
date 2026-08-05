import { currentLanguage } from "@/lib/site-server";
import { t } from "@/lib/i18n";

/**
 * Delt indlæsnings-skærm for de ruter der HAR en loading-grænse.
 *
 * NB: en `loading.tsx` gør ruten til en Suspense-grænse, og så streamer Next
 * skallen med status 200 med det samme. Kalder siden bagefter `notFound()`,
 * er statuskoden allerede sendt — resultatet er en soft 404 (200 med
 * "siden findes ikke"). Læg derfor KUN en loading.tsx på ruter der ikke kan
 * 404'e. Se `src/app/[...segments]/page.tsx`.
 */
export async function LoadingSpinner() {
  const lang = await currentLanguage();
  return (
    <main className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#00205B", borderTopColor: "transparent" }}
        />
        <p className="text-sm text-[var(--color-muted)]">{t("common.loading", lang)}</p>
      </div>
    </main>
  );
}
