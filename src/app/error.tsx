"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1
          className="text-3xl font-bold mb-4"
          style={{ fontFamily: "var(--font-serif)", color: "#00205B" }}
        >
          Noget gik galt
        </h1>
        <p className="text-[var(--color-muted)] mb-6">
          Siden kunne ikke indlæses. Prøv at genindlæse.
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: "#00205B" }}
        >
          Prøv igen
        </button>
      </div>
    </main>
  );
}
