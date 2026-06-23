-- Fastgjorte/featured artikler til forsidens karrusel.
ALTER TABLE articles ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
