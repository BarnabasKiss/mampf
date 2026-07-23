-- Mampf: Initiale Datenbank-Migration
-- Erstellt die Tabellen für Gerichte und Zutaten

CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    difficulty INTEGER NOT NULL CHECK(difficulty >= 1 AND difficulty <= 3),
    standard_portions INTEGER NOT NULL CHECK(standard_portions >= 1),
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    package_count REAL NOT NULL CHECK(package_count > 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ingredients_meal_id ON ingredients(meal_id);

-- Session-Tabelle für connect-sqlite3
CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    expires TEXT,
    sess TEXT
);