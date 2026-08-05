export type ChannelName = "bluesky" | "x" | "facebook";

export interface PostContent {
  /** Færdigbygget opslagstekst (se copy.ts) */
  text: string;
  /** Absolut artikel-URL */
  url: string;
  title: string;
  summary: string | null;
  /** Absolut URL til kampkort/cover (bruges som Bluesky-thumb) */
  imageUrl: string;
}

export interface SocialChannel {
  name: ChannelName;
  /**
   * Hvilket lands konto er det? En kanal er en KONTO, ikke en platform:
   * @studentathlete.dk på Bluesky og den danske Facebook-side er danske
   * kanaler og må kun få danske artikler. Uden dette felt postede den danske
   * konto en britisk artikel (2026-08-05).
   */
  country: string;
  /** Er de nødvendige secrets sat? Ukonfigurerede kanaler springes helt over. */
  isConfigured(): boolean;
  /** Post opslaget. Kaster ved fejl. Returnerer link til opslaget hvis kendt. */
  post(content: PostContent): Promise<{ postUrl: string | null }>;
}
