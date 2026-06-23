-- Gør viden-guider til redigerbare sider i samme pages-tabel.
-- kind: 'page' (statiske sider) | 'guide' (viden/[slug]). category: hub-gruppering.
ALTER TABLE pages ADD COLUMN kind TEXT NOT NULL DEFAULT 'page';
ALTER TABLE pages ADD COLUMN category TEXT;
