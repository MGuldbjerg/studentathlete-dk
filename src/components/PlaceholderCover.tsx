import { getSportColor } from "@/lib/types";

interface PlaceholderCoverProps {
  sport: string | null | undefined;
  athleteName: string | null | undefined;
  university?: string | null;
  size?: "sm" | "lg";
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "SA";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PlaceholderCover({
  sport,
  athleteName,
  university,
  size = "sm",
}: PlaceholderCoverProps) {
  const color = getSportColor(sport);
  const initials = getInitials(athleteName);
  const isLarge = size === "lg";

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: `linear-gradient(145deg, ${color}ee, ${color}99)`,
      }}
    >
      {/* Dekorativ cirkel i baggrunden */}
      <div
        className="absolute rounded-full opacity-10"
        style={{
          width: isLarge ? "300px" : "160px",
          height: isLarge ? "300px" : "160px",
          backgroundColor: "#ffffff",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Diagonal linje-mønster */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 0, transparent 12px)",
        }}
      />

      {/* Initialer */}
      <span
        className={`relative font-black text-white/90 tracking-tight ${
          isLarge ? "text-7xl md:text-8xl" : "text-4xl"
        }`}
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {initials}
      </span>

      {/* Sport-label */}
      {sport && (
        <span
          className={`relative uppercase tracking-[0.2em] text-white/50 font-semibold mt-1 ${
            isLarge ? "text-sm" : "text-[10px]"
          }`}
        >
          {sport}
        </span>
      )}

      {/* Universitet (kun på store kort) */}
      {isLarge && university && (
        <span className="relative text-white/30 text-xs mt-3 max-w-[80%] text-center truncate">
          {university}
        </span>
      )}

      {/* Logo i hjørnet */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-white.svg"
        alt=""
        className={`absolute opacity-20 ${
          isLarge ? "bottom-4 right-5 h-5" : "bottom-2 right-3 h-3"
        }`}
      />
    </div>
  );
}
