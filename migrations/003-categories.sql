-- Mampf: Kategorien für die Einkaufsliste
-- Erstellt die Tabelle für Einkaufslisten-Kategorien

CREATE TABLE IF NOT EXISTS shopping_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shopping_categories_sort_order ON shopping_categories(sort_order);