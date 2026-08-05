/**
 * DISCORD-BESKEDER PR. LAND.
 *
 * Ét site pr. land betyder én kø pr. land — og så giver ét fælles Discord-rum
 * ikke mening: en britisk kladde skal ikke stå mellem danske pipeline-fejl.
 *
 * Webhook slås op i denne rækkefølge:
 *   1. `DISCORD_WEBHOOK_<LANDEKODE>`  (fx DISCORD_WEBHOOK_UK)
 *   2. `DISCORD_WEBHOOK_URL`          (det fælles rum — også ops/drift)
 *
 * Fallbacket er med vilje: mangler et lands kanal endnu, forsvinder beskeden
 * ikke, den lander bare i fællesrummet. Et nyt land kan altså tændes uden at
 * røre koden — opret kanalen, tilføj secret'en.
 */
import { countryProfile } from "../../src/lib/countries";

export interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

/** Farver: grøn = noget venter på dig, rød = fejl, blå = rapport. */
export const COLOR = { ready: 3066993, error: 15158332, report: 5793266 } as const;

export function webhookFor(country?: string): string | null {
  const code = (country ?? "").toUpperCase();
  const perCountry = code ? process.env[`DISCORD_WEBHOOK_${code}`] : undefined;
  return perCountry || process.env.DISCORD_WEBHOOK_URL || null;
}

/**
 * Direkte link til admin FOR DET LAND beskeden handler om.
 *
 * `/api/admin/land` sætter landevalget og sender videre til admin, så et klik
 * fra Discord lander i den rigtige kø — i stedet for i den forrige.
 */
export function adminLink(country: string, next = "/admin"): string {
  const admin = countryProfile().host; // admin bor kun på standardsitet
  return `https://${admin}/api/admin/land?code=${country.toUpperCase()}&next=${encodeURIComponent(next)}`;
}

/**
 * Send én besked. Fejler ALDRIG kaldet: en notifikation må ikke vælte det job
 * den rapporterer om — så ville en webhook-fejl koste hele scrapen.
 */
export async function notify(embed: DiscordEmbed, country?: string): Promise<boolean> {
  const webhook = webhookFor(country);
  if (!webhook) {
    console.warn(`[notify] ingen webhook for ${country ?? "fælles"} — beskeden droppes`);
    return false;
  }
  const body = {
    embeds: [
      {
        footer: { text: country ? countryProfile(country).brand : "StudentAthlete" },
        timestamp: new Date().toISOString(),
        ...embed,
      },
    ],
  };
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[notify] Discord svarede ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[notify] kunne ikke sende: ${err}`);
    return false;
  }
}

/** "Der ligger n kladder til gennemlæsning" — med link ind i den rigtige kø. */
export async function notifyDraftsReady(country: string, count: number, titles: string[] = []) {
  if (count <= 0) return;
  const brand = countryProfile(country).brand;
  const sample = titles.slice(0, 5).map((t) => `• ${t}`).join("\n");
  await notify(
    {
      title: `📝 ${count} ${count === 1 ? "kladde" : "kladder"} klar til gennemlæsning — ${brand}`,
      description: [sample, `\n[Åbn køen for ${country.toUpperCase()}](${adminLink(country)})`]
        .filter(Boolean)
        .join("\n"),
      color: COLOR.ready,
    },
    country,
  );
}

/** Fejl i et landespecifikt job. Globale jobfejl hører i fællesrummet. */
export async function notifyFailure(country: string | undefined, title: string, detail: string) {
  await notify({ title: `❌ ${title}`, description: detail.slice(0, 1800), color: COLOR.error }, country);
}
