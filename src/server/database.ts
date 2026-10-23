import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { runMigrations, defaultMigrationsDir } from './migrate';

let db: Database.Database | undefined;

function databasePath(): string {
  return process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'meals.sqlite');
}

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = databasePath();
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/** Öffnet die Datenbank und wendet alle ausstehenden Migrationen an. */
export function initializeDatabase(): void {
  const applied = runMigrations(getDatabase(), defaultMigrationsDir());
  for (const name of applied) {
    console.log(`Migration ausgeführt: ${name}`);
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = undefined;
    console.log('Datenbankverbindung geschlossen.');
  }
}
