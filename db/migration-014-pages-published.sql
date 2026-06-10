-- Kladde-tilstand for statiske sider: published=0 → kun synlig i admin,
-- published=1 → offentlig på /<slug>. Default 0 så seedede udkast (med
-- [REDIGER:-pladsholdere) aldrig går live uden redaktørens klik.
ALTER TABLE pages ADD COLUMN published INTEGER NOT NULL DEFAULT 0;
