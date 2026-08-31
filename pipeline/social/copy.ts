/**
 * Regelbaseret opslagstekst pr. kanal — ingen LLM-kald.
 * Kampkortet (OG-billedet) leverer det visuelle; teksten er titel + link.
 */

import { CHANNEL_PLATFORM, type ChannelName } from "./types";

/** Klip ved ordgrænse og tilføj ellipse hvis teksten er for lang. */
export function truncate(text: string, max: number): string {
  if ([...text].length <= max) return text;
  const cut = [...text].slice(0, max - 1).join("");
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut) + "…";
}

export interface PostCopyInput {
  title: string;
  summary: string | null;
  url: string;
}

/**
 * Bluesky: 300 tegn, link ligger i embed-kortet — ikke i teksten.
 * X: 280 tegn, hvor et link altid tæller 23 (t.co) — titel klippes til 250.
 * Facebook: message + link sendes som separate felter; rigelig plads til ingress.
 */
export function buildPostText(input: PostCopyInput, channel: ChannelName): string {
  // Teksten hører til PLATFORMEN (tegngrænser, hvor linket må stå), ikke til
  // kontoen — den danske og den britiske Bluesky-konto skriver ens.
  switch (CHANNEL_PLATFORM[channel]) {
    case "bluesky":
      return truncate(input.title, 300);
    case "x":
      return `${truncate(input.title, 250)}\n\n${input.url}`;
    case "facebook": {
      const summary = input.summary?.trim();
      return summary ? `${input.title}\n\n${truncate(summary, 400)}` : input.title;
    }
  }
}
