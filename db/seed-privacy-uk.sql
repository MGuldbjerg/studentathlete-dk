-- Privacy page for student-athlete.co.uk (pages: slug 'privatliv', country 'UK').
--
-- From UDKAST-persondata-uk.md (2026-08-17), with three changes made 2026-09-30
-- for the AdSense review:
--   1. An "Advertising" section with the disclosure AdSense requires: third-party
--      vendors including Google use cookies, and how to opt out.
--   2. "No draft is published until a person has read it" replaced by what is
--      true today: drafts are checked against their source, and a person decides
--      what is published (sourced table facts may publish direct since 09-17).
--   3. "No photographs of athletes under 18" dropped: ages are not stored, so no
--      code can enforce it. Replaced by removal on request.
--
-- Stored under the Danish storage slug 'privatliv'; served at /privacy by the
-- middleware (RouteKey "privacy"). Seeded UNPUBLISHED: the controller line needs
-- Mikkel. To publish: fill it in (admin → Sider on the UK host, or edit here and
-- re-run), set published = 1, and set hasPrivacyPage: true in countries/uk.ts.
--
-- Run: wrangler d1 execute studentathlete-dk --remote --file=db/seed-privacy-uk.sql

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, updated_at) VALUES
('privatliv', 'UK', 'Privacy',
'Student-Athlete.co.uk is an editorial publication about British athletes at American colleges. This page explains what information we handle, why, and what you can ask us to do.

## Where the information comes from

Everything we hold about athletes comes from **publicly available sources**: universities'' own team pages (rosters), their news sections and RSS feeds. We do not build profiles from social media, we do not buy data, and we do not ask athletes for information.

## What we hold

**About athletes, on the site:** name (and the school''s spelling of it), home town and country, university, division, sport, position, academic year and expected graduation, sex (derived from the team''s own name), a link to the athlete''s official profile at their school, and in some cases the school''s own roster photograph with a credit. Plus the articles and profile texts we publish.

**About athletes, internally:** we keep an internal catalogue of international college athletes, used to judge which countries could support an edition. It is not published and is not reachable from the site.

**About you as a reader:** our own statistics use no cookies. We never store your IP address — only a hash made with a salt that changes every day, so it cannot be linked across days or traced back to you. We store the page address, a referrer value, country, device type and sometimes a channel name. If you write to us, we keep what you wrote until the enquiry is closed.

## Advertising

The site shows adverts from Google AdSense. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites. Google''s use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the internet.

If you are in the UK, the EU or the EEA, Google asks for your consent before using cookies for personalised advertising, through its own consent message. You can change your choice at any time from the "Cookie settings" link at the bottom of every page.

You can opt out of personalised advertising in [Google''s Ad Settings](https://adssettings.google.com), and opt out of other vendors'' use of cookies for personalised advertising at [www.aboutads.info](https://www.aboutads.info/choices/) or [www.youronlinechoices.eu](https://www.youronlinechoices.eu). Read more about how Google uses information from sites that use its services at [policies.google.com/technologies/partner-sites](https://policies.google.com/technologies/partner-sites). See also our [cookie policy](/cookies).

## Why, and on what basis

**Journalism.** Our handling of athlete information is for the special purposes of journalism. Paragraph 26 of Schedule 2 to the Data Protection Act 2018 exempts processing for journalism from much of the UK GDPR where publication is in the public interest and compliance would be incompatible with journalism. Our own standards do the work the exemption assumes: we check what we publish against its source, we correct mistakes visibly, and we do not report on private life.

**The internal catalogue** is not journalism in itself, so it rests on legitimate interests (Art. 6(1)(f)): our interest in planning editorial coverage, weighed against a very limited intrusion — the information is public roster fact, it is not published, and it contains no special category data. Our written assessment is on file and available on request.

**Statistics** rest on our legitimate interest in knowing what is read. They cannot identify you.

## Artificial intelligence

Article drafts are written by language models from a fact sheet extracted from the original source. Every draft is checked against that source before it is published, and a person decides what is published. We send the public source text and roster facts to the model provider; we never send reader information. See [how we use AI](/how-we-use-ai).

## Who we share with

- **Cloudflare** — hosting, database and logging (processor)
- **GitHub** — runs our automated pipeline (processor)
- **Language model providers** (including Mistral, Google, Groq and Anthropic) — receive source text and roster facts for drafting and checking (processors)
- **Google** — serves advertising on the site and collects your consent for it through its own consent message. Google is an independent controller for advertising; we have no access to that data.

We do not sell information, and we do not pass athlete information to recruitment agencies or other commercial parties.

## How long

Published articles are kept as an editorial archive. Roster information is updated while an athlete is on a team; once an athlete is no longer rostered, the profile is marked as concluded. Catalogue rows are reviewed and deleted once out of date. Statistics events are deleted after 12 months.

## Under-18s

A few first-year athletes are 17. We weigh their interests more heavily and write about them only in a sporting context. We remove any photograph on request, without needing a reason.

## Special category data

We record no health information, criminal matters or other special categories in our structured data, and our editorial safeguards flag stories of that kind for manual judgement before they can become an article.

## What you can ask for

You can ask what we hold about you, ask us to correct a mistake, object to the processing, or ask to be erased. Write to us via the [contact page](/contact). **You will have a reply within four weeks.**

- **Catalogue rows** we delete on request, no reason needed.
- **Published articles** are an editorial judgement. We always correct facts, and the correction is visible on the article. An article is not removed merely because it is uncomfortable to read — that is the same balance every publisher applies. If you object, we also keep you out of future collection.

## Complaints

If you are unhappy with our answer, you can complain to the Information Commissioner''s Office ([ico.org.uk](https://ico.org.uk)). If your complaint is about the content of an article, write to us first; we handle it editorially and correct it if we got it wrong.

**Controller:** [NAME AND ADDRESS — TO FILL IN] · **Contact:** info@student-athlete.co.uk · **Last updated:** 30 September 2026',
'How Student-Athlete.co.uk handles information about athletes and readers, how advertising cookies work on the site, and what you can ask us to do.',
0, 'page', datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  updated_at = excluded.updated_at;
