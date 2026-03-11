export default function Loading() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#00205B", borderTopColor: "transparent" }}
        />
        <p className="text-sm text-[var(--color-muted)]">Indlæser...</p>
      </div>
    </main>
  );
}
