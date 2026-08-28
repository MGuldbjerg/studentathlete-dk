"use client";

import { t } from "@/lib/i18n";

/**
 * Fejl-boundary. Den er en KLIENT-komponent og kan derfor ikke få sproget
 * fra serveren — så den læser det fra `<html lang>`, som layoutet allerede
 * sætter pr. site. Teksterne stod hardkodet på dansk og mødte britiske
 * læsere på .co.uk.
 */
function siteLang(): string {
  if (typeof document === "undefined") return "en";
  return document.documentElement.lang || "en";
}

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lang = siteLang();
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1
          className="text-3xl font-bold mb-4"
          style={{ fontFamily: "var(--font-serif)", color: "#00205B" }}
        >
          {t("error.title", lang)}
        </h1>
        <p className="text-[var(--color-muted)] mb-6">{t("error.body", lang)}</p>
        <button
          onClick={reset}
          className="px-5 py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: "#00205B" }}
        >
          {t("error.retry", lang)}
        </button>
      </div>
    </main>
  );
}
