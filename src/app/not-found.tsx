import Link from "next/link";

export default function NotFound() {
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
          Siden blev ikke fundet
        </h1>
        <p className="text-[var(--color-muted)] mb-6">
          Den side du leder efter eksisterer ikke eller er blevet flyttet.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: "#00205B" }}
        >
          Gå til forsiden
        </Link>
      </div>
    </main>
  );
}
