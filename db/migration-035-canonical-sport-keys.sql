-- Migration 035: athletes.sport bliver en SPROGFRI nøgle.
--
-- Kolonnen indeholdt danske navneord ("fodbold", "svømning") — altså var
-- databasens primærnøgle for en sportsgren et dansk ord, og alt nedenstrøms
-- sammenlignede mod danske strenge. Et tysk site skulle enten skrive "fodbold"
-- i sin egen database eller have sin egen kopi af logikken.
--
-- Vi vedtager den vokabular projektet ALLEREDE bruger to andre steder:
-- roster_checks.sport og international_athletes.sport har hele tiden gemt
-- NCAA-sluggen ("soccer", "swimming-and-diving"). Efter denne migration er de
-- tre tabeller endelig enige.
--
-- Visningsnavnet ("Fodbold") og URL-sluggen ("/fodbold") kommer nu fra
-- sprogpakken (src/lib/i18n/da.ts) — læserne ser præcis det samme som før.

UPDATE athletes SET sport = 'soccer'              WHERE sport = 'fodbold';
UPDATE athletes SET sport = 'swimming-and-diving' WHERE sport = 'svømning';
UPDATE athletes SET sport = 'track-and-field'     WHERE sport = 'atletik';
UPDATE athletes SET sport = 'ice-hockey'          WHERE sport = 'ishockey';
UPDATE athletes SET sport = 'rowing'              WHERE sport = 'roning';
UPDATE athletes SET sport = 'gymnastics'          WHERE sport = 'gymnastik';
UPDATE athletes SET sport = 'other'               WHERE sport = 'andet';

-- football, basketball, baseball, golf, tennis, volleyball var allerede
-- kanoniske og røres ikke.

CREATE INDEX IF NOT EXISTS idx_athletes_sport ON athletes(sport);
