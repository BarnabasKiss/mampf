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
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    console.log('Datenbankverbindung geschlossen.');
  }
}