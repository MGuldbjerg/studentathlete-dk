import { currentSite } from "@/lib/site-server";
import { getDigestSports } from "@/lib/db";
import { sportLabel, t } from "@/lib/i18n";
import { DigestSignupForm } from "./DigestSignupForm";

/**
 * Server wrapper for the digest sign-up: renders nothing unless the site has
 * `emailDigest` switched on, and offers only sports the site covers. Placed at
 * the end of articles (the article's sport ticked) and on sport pages.
 */
export async function DigestSignup({ sport }: { sport: string | null }) {
  const site = await currentSite();
  if (!site.emailDigest) return null;
  const lang = site.language;
  const keys = await getDigestSports(site.code);
  if (keys.length === 0) return null;
  return (
    <DigestSignupForm
      sports={keys.map((k) => ({ key: k, label: sportLabel(k, lang) }))}
      preselect={sport && keys.includes(sport) ? sport : null}
      labels={{
        heading: t("digest.heading", lang),
        intro: t("digest.intro", lang),
        pick: t("digest.pick", lang),
        email: t("digest.email_label", lang),
        submit: t("digest.submit", lang),
        sent: t("digest.sent", lang),
        error: t("digest.error", lang),
        privacy: t("digest.privacy", lang),
        more: t("digest.more_sports", lang),
      }}
    />
  );
}
