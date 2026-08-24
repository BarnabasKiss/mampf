import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'meals.sqlite');

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    // Sicherstellen, dass das Datenverzeichnis existiert
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);

    // Fremdschlüssel-Prüfung aktivieren
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDatabase();

  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn('Migrationsverzeichnis nicht gefunden:', migrationsDir);
    return;
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);
    const migration = fs.readFileSync(migrationPath, 'utf-8');
    database.exec(migration);
    console.log(`Migration ausgeführt: ${file}`);
  }

  ensureShoppingItemCategoryColumn(database);
}

// Fügt die Kategorie-Spalte zu shopping_list_items hinzu, falls sie fehlt.
// (ALTER TABLE ist nicht idempotent und kann nicht sicher in einer .sql-Migration laufen,
//  da die Migrationsdateien bei jedem Start erneut ausgeführt werden.)
function ensureShoppingItemCategoryColumn(database: Database.Database): void {
  const columns = database.pragma('table_info(shopping_list_items)') as { name: string }[];
  if (!columns.some(col => col.name === 'category_id')) {
    database.exec('ALTER TABLE shopping_list_items ADD COLUMN category_id INTEGER');
    console.log('Spalte category_id zu shopping_list_items hinzugefügt.');
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    console.log('Datenbankverbindung geschlossen.');
  }
}