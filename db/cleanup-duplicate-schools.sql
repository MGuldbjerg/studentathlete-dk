-- Ryd op i duplikerede skoler.
-- Skoler UDEN common_name er de gamle (fuld-navns-slug).
-- Skoler MED common_name er de nye (fra CSV-import).
-- Migrér referencer og slet de gamle.

-- Slet roster_checks der peger på gamle duplikater
-- (de nye skoler har allerede korrekte roster_checks)
DELETE FROM roster_checks
WHERE school_id IN (
  SELECT old.id FROM schools old
  WHERE old.common_name IS NULL
    AND EXISTS (
      SELECT 1 FROM schools new
      WHERE new.name = old.name AND new.common_name IS NOT NULL
    )
);

-- Migrér sources fra gamle til nye skoler
UPDATE sources
SET school_id = (
  SELECT new.id FROM schools new
  WHERE new.name = (SELECT old.name FROM schools old WHERE old.id = sources.school_id)
    AND new.common_name IS NOT NULL
  LIMIT 1
)
WHERE school_id IN (
  SELECT old.id FROM schools old
  WHERE old.common_name IS NULL
    AND EXISTS (
      SELECT 1 FROM schools new
      WHERE new.name = old.name AND new.common_name IS NOT NULL
    )
);

-- Slet gamle duplikerede skoler
DELETE FROM schools
WHERE common_name IS NULL
  AND EXISTS (
    SELECT 1 FROM schools s2
    WHERE s2.name = schools.name AND s2.common_name IS NOT NULL
  );

-- Opdatér de resterende gamle skoler (de originale 15 seeds uden CSV-match)
-- med common_name baseret på deres navn
UPDATE schools
SET common_name = REPLACE(REPLACE(name, ' University', ''), ' College', '')
WHERE common_name IS NULL;
