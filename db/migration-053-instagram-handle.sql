-- Migration 053: a handle printed on the athlete's own bio page is identity;
-- a handle found by searching a name is a guess.
--
-- Mikkel, 16 September 2026: «can you programmatically follow the athletes with
-- IG handles in their bios?» The follow itself cannot be automated. Meta's
-- Instagram Platform exposes publishing, comments, messages, mentions and
-- insights — there has been no relationship/follow endpoint since the legacy
-- API was retired in 2018. Doing it anyway means driving a browser against the
-- ToS, and the account that would get action-blocked is @studentathlete.dk,
-- which the publishing pipeline posts through.
--
-- The FINDING is automatable. Sample of 52 British athletes' bio pages: 42
-- carried an instagram.com link, but nearly all were department accounts from
-- the site chrome (bryanthoops, yalefencing, fsc_waterski). Five (~10%) carried
-- the athlete's own name-matched handle. Across the 2,583 British athletes with
-- a bio_url that is ~250-300 handles — a worklist, not a research project.
--
-- Identity rests on the same rule as the photo queue (suggest-photos.ts): the
-- handle counts because it sits on the SCHOOL'S page FOR THIS ATHLETE. This is
-- exactly what the Bluesky follower lacked, where a name search over a global
-- index scored 0% precision on 30 athletes.
--
-- `instagram_confidence` separates the two kinds of find: 'name_match' is one
-- click, 'unverified' (eva_isabel_ — plausible, not provable) needs a human to
-- look. 'rejected' is remembered so a wrong candidate never returns.
--
-- `instagram_checked_at` is stamped on EVERY attempt, result or not. That is
-- the lesson from migration-046: a queue ordered by a column only successes
-- stamp will show the same A-names every night forever.
ALTER TABLE athletes ADD COLUMN instagram_handle TEXT;
ALTER TABLE athletes ADD COLUMN instagram_confidence TEXT;           -- 'name_match' | 'unverified'
ALTER TABLE athletes ADD COLUMN instagram_status TEXT NOT NULL DEFAULT 'pending'; -- 'pending' | 'followed' | 'rejected'
ALTER TABLE athletes ADD COLUMN instagram_checked_at TEXT;

-- The admin queue selects on (status, country) and the harvester rotates on
-- checked_at; both are covered here.
CREATE INDEX IF NOT EXISTS idx_athletes_instagram ON athletes(instagram_status, home_country);
