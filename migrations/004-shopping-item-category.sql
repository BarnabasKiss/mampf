-- Mampf: Kategorie-Zuordnung für Einkaufslisten-Items
-- Hinweis: ALTER TABLE ist nicht idempotent. Der Migrations-Runner (src/server/migrate.ts)
-- behandelt "duplicate column name" bei Bestandsdatenbanken als bereits angewendet.

ALTER TABLE shopping_list_items ADD COLUMN category_id INTEGER;
