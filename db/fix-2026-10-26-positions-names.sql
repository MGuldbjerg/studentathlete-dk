-- Quality sweep 2026-10-26, cleanup approved by Mikkel the same day («Clean up»).
-- Heights stored as position (Sidearm prints the height inside the position
-- element; rosters without positions gave the height): 1,121 rows, 28 values,
-- all heights. cleanPosition (src/lib/roster-clean.ts) keeps new ones out.
UPDATE athletes SET position = NULL, updated_at = datetime('now')
 WHERE position GLOB '[3-8]-[0-9]*' OR position GLOB '[3-8]''*' OR position GLOB '[3-8]′*';
-- Double-spaced names (the JS roster path saved them raw; now cleaned): 29 rows.
UPDATE athletes SET name = trim(replace(replace(name, '   ', ' '), '  ', ' ')), updated_at = datetime('now')
 WHERE name LIKE '%  %' OR name <> trim(name);
