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

  const migrationPath = path.join(__dirname, '..', '..', 'migrations', '001-initial.sql');
  if (fs.existsSync(migrationPath)) {
    const migration = fs.readFileSync(migrationPath, 'utf-8');
    database.exec(migration);
    console.log('Datenbank-Migration erfolgreich ausgeführt.');
  } else {
    console.warn('Migrationsdatei nicht gefunden:', migrationPath);
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    console.log('Datenbankverbindung geschlossen.');
  }
}