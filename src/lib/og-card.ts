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

/**
 * Kortets FORMATER. Ét element-træ, to lærreder.
 *
 * `landscape` (1200×630, 1.91:1) er delekortet — Facebook, Bluesky, og sitets
 * eget cover. `portrait` (1080×1350, 4:5) er Instagram-kortet.
 *
 * Hvorfor et selvstændigt format og ikke en beskæring: 1.91:1 beskåret til 4:5
 * mister to tredjedele af bredden, altså navnet. Og Instagram tillader netop
 * 4:5 til 1.91:1 — landscape ville passe med 0,3 % margen, men se ud som et
 * delt link i et feed hvor links ikke virker. Tallene er derfor ikke en
 * skalering af de samme tal: et telefon-feed læses længere væk fra øjet og på
 * en smallere spalte, så typen er løftet, ikke strukket.
 */
export type CardFormat = "landscape" | "portrait";

export interface CardFormatSpec {
  width: number;
  height: number;
  padding: string;
  /** Navnets størrelse: [langt navn (>22 tegn), kort navn] */
  nameSize: [number, number];
  nameMaxWidth: number;
  universitySize: number;
  factsSize: number;
  scoreSize: number;
  chipSize: number;
  chipEmojiSize: number;
  /**
   * Det store halvtransparente piktogram i baggrunden.
   *
   * Lodret forankring følger indholdet: i landscape ligger teksten i midten og
   * piktogrammet hænger ud af bunden. I portræt ligger teksten i bunden, så
   * piktogrammet skal OP — ellers står den øverste halvdel af kortet tom.
   */
  backdropEmojiSize: number;
  backdropRight: number;
  backdropEdge: "top" | "bottom";
  backdropOffset: number;
  dateSize: number;
  /** Indholdets vandrette padding — datoen flugter med teksten, ikke kanten. */
  contentPaddingX: number;
  /**
   * Hvor indholdet ligger i rammen. 1.91:1 er så lav at midten ER rammen;
   * 4:5 er halvanden gang så høj, og centreret indhold efterlader dødt rum
   * både over og under. Portrættet lægger sig derfor i bunden, så det store
   * piktogram får den øverste tredjedel.
   */
  justify: "center" | "flex-end";
  /**
   * Skal resultatet stå UNDER scoren i stedet for ved siden af? I 1080 px
   * bredde løber «Brown 2 - Hofstra 1» + «Loss» ud over kanten.
   */
  stackOutcome: boolean;
  edgePadding: number;
  logoWidth: number;
  logoHeight: number;
}

export const CARD_FORMATS: Record<CardFormat, CardFormatSpec> = {
  landscape: {
    width: 1200,
    height: 630,
    padding: "60px 80px",
    nameSize: [52, 64],
    nameMaxWidth: 800,
    universitySize: 26,
    factsSize: 22,
    scoreSize: 54,
    chipSize: 16,
    chipEmojiSize: 36,
    backdropEmojiSize: 320,
    backdropRight: -30,
    backdropEdge: "bottom",
    backdropOffset: -50,
    dateSize: 18,
    contentPaddingX: 80,
    justify: "center",
    stackOutcome: false,
    edgePadding: 28,
    logoWidth: 200,
    logoHeight: 36,
  },
  portrait: {
    width: 1080,
    height: 1350,
    padding: "90px 70px 150px",
    nameSize: [76, 96],
    nameMaxWidth: 940,
    universitySize: 38,
    factsSize: 32,
    scoreSize: 78,
    chipSize: 22,
    chipEmojiSize: 52,
    backdropEmojiSize: 560,
    backdropRight: -140,
    backdropEdge: "top",
    backdropOffset: 60,
    dateSize: 26,
    contentPaddingX: 70,
    justify: "flex-end",
    stackOutcome: true,
    edgePadding: 44,
    logoWidth: 280,
    logoHeight: 50,
  },
};

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
 *
 * scale=0.5 → Worker-fallback (render i 600×315); scale=1 → pipeline.
 * format vælger lærredet — se `CARD_FORMATS`. Standard er `landscape`, så
 * ingen eksisterende kalder skifter opførsel ved at lade være med at vælge.
 */
export function buildMatchCardElement(
  data: CardData,
  logoDataUri: string,
  scale: 0.5 | 1,
  format: CardFormat = "landscape",
): OgElement {
  const fmt = CARD_FORMATS[format];
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
  const nameSize = name.length > 22 ? fmt.nameSize[0] : fmt.nameSize[1];

  const outerStyle: Style = {
    width: `${fmt.width}px`,
    height: `${fmt.height}px`,
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
        el("div", { fontSize: fmt.chipEmojiSize, display: "flex" }, emoji),
        ...(sportLabel
          ? [
              el(
                "div",
                {
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 4,
                  padding: "6px 16px",
                  color: "white",
                  fontSize: fmt.chipSize,
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
      { fontSize: nameSize, fontWeight: 900, color: "white", lineHeight: 1.1, maxWidth: fmt.nameMaxWidth },
      name,
    ),
  ];

  if (data.university) {
    content.push(
      el(
        "div",
        {
          fontSize: fmt.universitySize,
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
          fontSize: fmt.factsSize,
          color: "rgba(255,255,255,0.6)",
          marginTop: 22,
          fontFamily: "'Noto Sans', sans-serif",
          display: "flex",
          gap: 10,
        },
        [
          facts.opponent ? `${languagePack(lang).ui["card.versus"]} ${facts.opponent}` : "",
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
        {
          display: "flex",
          flexDirection: fmt.stackOutcome ? "column" : "row",
          alignItems: fmt.stackOutcome ? "flex-start" : "center",
          gap: 16,
          marginTop: 26,
        },
        [
          el(
            "div",
            {
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 8,
              padding: "10px 26px",
              color: "white",
              fontSize: fmt.scoreSize,
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
                    fontSize: fmt.factsSize,
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
        bottom: fmt.edgePadding,
        left: fmt.contentPaddingX,
        fontSize: fmt.dateSize,
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
      {
        position: "absolute",
        right: fmt.backdropRight,
        [fmt.backdropEdge]: fmt.backdropOffset,
        fontSize: fmt.backdropEmojiSize,
        opacity: 0.14,
        display: "flex",
      },
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
        justifyContent: fmt.justify,
        padding: fmt.padding,
        width: "100%",
        height: "100%",
        position: "relative",
      },
      content,
    ),
    // Logo-branding
    el(
      "img",
      { position: "absolute", bottom: fmt.edgePadding, right: fmt.edgePadding + 12, opacity: 0.4 },
      undefined,
      { src: logoDataUri, width: fmt.logoWidth, height: fmt.logoHeight, alt: "" },
    ),
    // Rød bund-streg
    el("div", { position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "#BF0A30" }),
  ]);
}
