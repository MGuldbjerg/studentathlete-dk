-- Engelske statiske sider til student-athlete.co.uk (country = 'UK').
--
-- Oversat fra de danske originaler, men IKKE ord for ord: "danske atleter" er
-- britiske, domænet og e-mailadressen er UK'ens, og selvpåstande om antal er
-- udeladt (den danske /om siger "over 100 aktive" — UK-tallet flytter sig
-- stadig, og en forældet påstand er værre end ingen).
--
-- ⚠️ ULÆST AF MENNESKE. Mikkel læser dem igennem og retter til; derfor er de
-- seedet med published = 1, så de KAN ses og redigeres i admin på UK-værten,
-- men sitet er ikke live endnu, så ingen læser dem imens.
--
-- Kør: wrangler d1 execute studentathlete-dk --remote --file=db/seed-pages-uk.sql
-- Idempotent: ON CONFLICT(slug, country) opdaterer i stedet for at duplikere.

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, updated_at) VALUES
('om', 'UK', 'About Student-Athlete.co.uk',
'## British athletes in American college sport

Every year, young Britons cross the Atlantic to combine education with elite sport at American universities. They play football, basketball and golf, they swim, row and run for their schools in the NCAA — and back home, their results usually go unreported.

Student-Athlete.co.uk gathers those stories in one place. We follow British college athletes across divisions and sports, and publish news, profiles and season updates on how they get on.

## What you will find here

- **News** — matches, results and personal bests, shortly after they happen
- **Athlete profiles** — who the British athletes are, where they play, and how their season is going
- **School profiles** — the universities where Britons are competing

## Who is behind it

Student-Athlete.co.uk is part of a small independent network founded and run by Mikkel Guldbjerg, which started with the Danish edition. The idea is the same in both countries: the routine match reports are the part nobody enjoys writing, so they are the part we automate — freeing time for the journalism people actually want to do, such as features, portraits and interviews.

Would you like to help run the site as a volunteer? [Get in touch](/kontakt).

## How we make the content

Our articles are built from official sources — the universities'' own athletics sites, match reports and box scores. We use AI tools in the research and writing process, and every article is reviewed by an editor before publication. Read more on [How we use AI](/ai-brug).

Have a correction, a tip about a British athlete we do not know about, or a question? Write to us via the [contact page](/kontakt).',
'Student-Athlete.co.uk covers British college athletes in the United States — news, profiles and results from the NCAA, gathered in one place.',
1, 'page', datetime('now')),

('ai-brug', 'UK', 'How we use AI',
'## Openness about how we work

Student-Athlete.co.uk uses artificial intelligence as a tool in the research and writing process. We would rather be completely open about that — here is exactly how it works.

## How an article comes about

1. **Sources**: our system monitors the universities'' official athletics sites and news feeds for mentions of British athletes. We use the teams'' own websites to keep the sourcing authentic.
2. **Fact sheet**: a structured fact sheet is extracted from the source — results, statistics, observations and quotes, each with its reference. Only facts the source states explicitly make it through.
3. **Writing**: an AI model drafts the article **solely from that fact sheet**. It may not add, guess or embellish. Numbers are cross-checked against the official box score where one exists.
4. **Verification**: a separate checking step compares the draft against the fact sheet and flags any claim without support.
5. **The editor**: a person reads, edits and approves every article before it is published. Nothing is published automatically.

The point of working this way is to free up time for real people. The ambition is for volunteers to run the site, focusing on the enjoyable journalism — features, portraits, interviews, analysis.

Very few people, if any, find it exciting to write routine quote-based match reports, and that is the part of the process we have tried to automate. But it is a first principle that nothing is published unless a human has read it.

## Mistakes can happen

Despite the sourcing requirements, the cross-checks and the human approval, errors can still occur. If you find one, [write to us](/kontakt) — we correct as quickly as we can, and we are grateful for every tip.

## Photos and graphics

In time we would like to use photographs of the athletes, but only where the rights are clear. Until then, most articles carry a generated card in the school''s colours rather than a photograph.',
'Openness about AI at Student-Athlete.co.uk — how we use artificial intelligence, and why a human reads everything before publication.',
1, 'page', datetime('now')),

('presseetik', 'UK', 'Editorial standards & complaints',
'Student-Athlete.co.uk aims for accurate and fair coverage. If you spot an error, or would like something corrected or removed, we want to hear from you.

## Correct an error

If you find a factual error in an article, write to us via [contact](/kontakt) with a link to the article and a description of the error. We correct significant errors on our own initiative as soon as we become aware of them, and we mark the correction clearly.

## Correction or right of reply

If you are mentioned and believe something should be corrected, or supplemented with your perspective, please contact us — we publish relevant replies.

## Removal / unpublishing

You can ask for an article, or information about you, to be removed or de-indexed. We consider each request on its merits and as quickly as we can.

## How we work

Our articles are written with the help of artificial intelligence from public sources, and read by a person before publication. Read more about [how we use AI](/ai-brug).

## Contact

Write to us via the [contact page](/kontakt).',
'How we correct, supplement or remove content on Student-Athlete.co.uk — report an error, request a correction or ask for removal.',
1, 'page', datetime('now')),

('kontakt', 'UK', 'Contact',
'## Write to us

**Email**: info@student-athlete.co.uk

We read everything and reply as quickly as we can, but this is a passion project that runs alongside ordinary work and family life.

## Tip us about an athlete

Do you know a British athlete at an American university who we are not covering? Send the name, the university and the sport, and we will add them to our coverage.

## Corrections

We work hard to keep everything accurate and grounded in sources. If you find an error in an article or on an athlete profile, write to us with a link to the page and a description of the error. We correct it as quickly as we can and note significant corrections in the article.

## Removal of information

If you are mentioned on Student-Athlete.co.uk and would like information corrected or removed, you can always contact us. That applies to both articles and athlete profiles. We handle requests about personal data in accordance with data protection law and reply as quickly as we can.

Our content is built on publicly available sources — the universities'' official athletics sites and match reports — but your wishes carry real weight, particularly if you are the athlete concerned.

## Photos and rights

If you believe a photograph or other material on the site infringes your rights, contact us with documentation and we will remove it, or credit it correctly, straight away.',
'Contact Student-Athlete.co.uk — tips about British college athletes, corrections, removal of information and general enquiries.',
1, 'page', datetime('now')),

('cookies', 'UK', 'Cookie policy',
'Student-Athlete.co.uk respects your privacy. Here we explain which cookies we use.

## Our own statistics are cookie-free

We measure visits without cookies and without storing your IP address. Instead we use a daily-rotating, anonymised key that cannot be traced back to you. Our own statistics therefore require no consent.

## Necessary cookies

Our provider (Cloudflare) may set technical security cookies that are strictly necessary for the site to work and to protect it from abuse. These require no consent.

## Advertising cookies

The site shows advertising through Google AdSense. Google and its advertising partners may set cookies to display and measure adverts — and, if you allow it, to target them to your interests.

## Your consent

Consent is collected by Google''s own consent box, which appears when you visit the site from the EU/EEA, the United Kingdom or Switzerland. The box follows the IAB TCF industry standard. In it you can see which advertising providers are involved and choose whether your data may be used for personalised advertising. If you decline, your data is not used to personalise adverts.

Your choice is stored by Google on your own device — not by us.

## How to change your choice

Click "Cookie settings" at the bottom of the page. Google''s consent box opens again, and you can change or withdraw your consent as easily as you gave it.

If you cannot see the link — for example if you use an ad blocker, or if you are visiting from a country outside the EU/EEA, the UK and Switzerland, where the box is not shown — you can instead clear the site''s cookies and data in your browser. You will then be asked again on your next visit.

## Questions

Contact us via the [contact page](/kontakt).',
'How Student-Athlete.co.uk uses cookies — cookie-free statistics, necessary cookies, advertising cookies and how to change your consent.',
1, 'page', datetime('now'))

ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  published = excluded.published,
  kind = excluded.kind,
  updated_at = datetime('now');
