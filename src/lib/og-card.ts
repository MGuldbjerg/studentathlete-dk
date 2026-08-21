/**
 * Kampkortets element-træ — ÉN kilde til sandhed, delt mellem:
 *  - /api/og (Worker, on-the-fly-fallback i 600×315 via scale 0.5)
 *  - pipeline/render/render-cards.ts (Node, pre-render i fuld 1200×630)
 *
 * Træet er PLAIN OBJECTS ({type, props}) i stedet for JSX, så pipelinen kan
 * importere filen uden JSX-konfiguration — satori accepterer React-element-
 * lignende objekter direkte, og ImageResponse sender dem uændret videre.
 *
 * SATORI-GOTCHAS (lært 2026-06-10 — bevar disse invarianter ved ændringer):
 *  - ingen default-font: kaldere SKAL levere font-data
 *  - `inset`-shorthand ignoreres: brug eksplicit top/left/right/bottom
 *  - alpha-hex i gradients fejler tavst: solid farve + rgba()-overlay
 *  - hver div med >1 barn skal have display:flex
 */
import { sportColor, sportEmoji } from "./sports";
import { sportLabel as sportLabelFor, languagePack } from "./i18n";
import { countryProfile } from "./countries";

export const FALLBACK_COLOR = "#00205B";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Twemoji-piktogrammer (CC-BY 4.0 — krediteret på /ai-brug) pr. sport-nøgle
export function getSportEmoji(sport: string | null): string {
  return sportEmoji(sport);
}

export function getSportColorSafe(sport: string | null): string {
  return sportColor(sport);
}

export interface CardData {
  title: string;
  /** Artiklens site (ISO alpha-2). Bestemmer sprog på chip og dato. */
  country: string | null;
  athlete_name: string | null;
  sport: string | null;
  university: string | null;
  primary_color: string | null;
  fact_sheet: string | null;
  created_at: string;
}

export interface CardFacts {
  opponent: string | null;
  competition: string | null;
  date: string | null;
  finalScore: string | null;
  outcome: string | null;
}

export function parseCardFacts(factSheetJson: string | null): CardFacts {
  const empty: CardFacts = { opponent: null, competition: null, date: null, finalScore: null, outcome: null };
  if (!factSheetJson) return empty;
  try {
    const fs = JSON.parse(factSheetJson) as {
      event?: { opponent?: string | null; competition?: string | null; date?: string | null } | null;
      result?: { final_score?: string | null; outcome?: string | null } | null;
    };
    return {
      opponent: fs.event?.opponent ?? null,
      competition: fs.event?.competition ?? null,
      date: fs.event?.date ?? null,
      finalScore: fs.result?.final_score ?? null,
      outcome: fs.result?.outcome ?? null,
    };
  } catch {
    return empty;
  }
}

// ─── Element-hjælpere (satori-kompatible plain objects) ──────────────────────

type Style = Record<string, string | number>;
export interface OgElement {
  type: string;
  props: Record<string, unknown> & { style?: Style; children?: unknown };
}

function el(type: string, style: Style, children?: unknown, extra?: Record<string, unknown>): OgElement {
  return { type, props: { ...(extra ?? {}), style, children } };
}

/**
 * Byg kampkortets element-træ.
 * scale=0.5 → Worker-fallback (render i 600×315); scale=1 → pipeline (1200×630).
 */
export function buildMatchCardElement(
  data: CardData,
  logoDataUri: string,
  scale: 0.5 | 1,
): OgElement {
  // Kortet er det eneste stykke site der rejser ud på andres platforme, og
  // sproget kommer fra ARTIKLENS land — ikke fra standardsitet. Uden dette
  // stod der «FODBOLD» og «19. august 2026» på britiske artiklers delekort.
  const lang = countryProfile(data.country ?? undefined).language;
  const facts = parseCardFacts(data.fact_sheet);
  const color =
    data.primary_color && HEX_RE.test(data.primary_color)
      ? data.primary_color
      : getSportColorSafe(data.sport);
  const emoji = getSportEmoji(data.sport);
  // Kampkortets tekst er læservendt → sprogpakkens navn, ikke den rå nøgle.
  const sportLabel = data.sport
    ? sportLabelFor(data.sport, lang)
    : null;
  const dateLabel =
    facts.date ??
    new Date(data.created_at).toLocaleDateString(languagePack(lang).locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const name = data.athlete_name ?? data.title;
  const nameSize = name.length > 22 ? 52 : 64;

  const outerStyle: Style = {
    width: "1200px",
    height: "630px",
    display: "flex",
    position: "relative",
    fontFamily: "'Playfair Display', serif",
    overflow: "hidden",
  };
  if (scale !== 1) {
    outerStyle.transform = `scale(${scale})`;
    outerStyle.transformOrigin = "top left";
  }

  const content: OgElement[] = [
    // Sport-chip + piktogram
    el(
      "div",
      { display: "flex", alignItems: "center", gap: 14, marginBottom: 24 },
      [
        el("div", { fontSize: 36, display: "flex" }, emoji),
        ...(sportLabel
          ? [
              el(
                "div",
                {
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 4,
                  padding: "6px 16px",
                  color: "white",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 2,
                  fontFamily: "'Noto Sans', sans-serif",
                },
                sportLabel.toUpperCase(),
              ),
            ]
          : []),
      ],
    ),
    // Atletnavn
    el(
      "div",
      { fontSize: nameSize, fontWeight: 900, color: "white", lineHeight: 1.1, maxWidth: 800 },
      name,
    ),
  ];

  if (data.university) {
    content.push(
      el(
        "div",
        {
          fontSize: 26,
          color: "rgba(255,255,255,0.75)",
          marginTop: 10,
          fontFamily: "'Noto Sans', sans-serif",
        },
        data.university,
      ),
    );
  }

  if (facts.opponent || facts.competition) {
    content.push(
      el(
        "div",
        {
          fontSize: 22,
          color: "rgba(255,255,255,0.6)",
          marginTop: 22,
          fontFamily: "'Noto Sans', sans-serif",
          display: "flex",
          gap: 10,
        },
        [
          facts.opponent ? `mod ${facts.opponent}` : "",
          facts.opponent && facts.competition ? " · " : "",
          facts.competition ?? "",
        ],
      ),
    );
  }

  if (facts.finalScore) {
    content.push(
      el(
        "div",
        { display: "flex", alignItems: "center", gap: 16, marginTop: 26 },
        [
          el(
            "div",
            {
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 8,
              padding: "10px 26px",
              color: "white",
              fontSize: 54,
              fontWeight: 900,
              fontFamily: "'Noto Sans', sans-serif",
            },
            facts.finalScore,
          ),
          ...(facts.outcome && facts.outcome.length <= 24
            ? [
                el(
                  "div",
                  {
                    fontSize: 22,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'Noto Sans', sans-serif",
                  },
                  facts.outcome,
                ),
              ]
            : []),
        ],
      ),
    );
  }

  // Dato (absolut placeret i indholds-containeren)
  content.push(
    el(
      "div",
      {
        position: "absolute",
        bottom: 28,
        left: 80,
        fontSize: 18,
        color: "rgba(255,255,255,0.5)",
        fontFamily: "'Noto Sans', sans-serif",
      },
      dateLabel,
    ),
  );

  return el("div", outerStyle, [
    // Baggrund i skolefarve — solid + rgba-overlay (alpha-hex i gradients fejler i satori)
    el("div", { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: color }),
    el("div", {
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)",
    }),
    el("div", {
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      opacity: 0.06,
      backgroundImage:
        "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 0, transparent 16px)",
    }),
    // Stort halvtransparent piktogram
    el(
      "div",
      { position: "absolute", right: -30, bottom: -50, fontSize: 320, opacity: 0.14, display: "flex" },
      emoji,
    ),
    // Rød venstre streg
    el("div", { position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: "#BF0A30" }),
    // Indhold
    el(
      "div",
      {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 80px",
        width: "100%",
        height: "100%",
        position: "relative",
      },
      content,
    ),
    // Logo-branding
    el(
      "img",
      { position: "absolute", bottom: 28, right: 40, opacity: 0.4 },
      undefined,
      { src: logoDataUri, width: 200, height: 36, alt: "" },
    ),
    // Rød bund-streg
    el("div", { position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "#BF0A30" }),
  ]);
}
