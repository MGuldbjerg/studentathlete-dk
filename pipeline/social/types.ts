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
  /** Er de nødvendige secrets sat? Ukonfigurerede kanaler springes helt over. */
  isConfigured(): boolean;
  /** Post opslaget. Kaster ved fejl. Returnerer link til opslaget hvis kendt. */
  post(content: PostContent): Promise<{ postUrl: string | null }>;
}
