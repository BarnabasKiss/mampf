import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Minimaler Migrations-Runner.
 *
 * - Migrationen liegen als `NNN-name.sql` in `migrations/` und laufen in Dateinamen-Reihenfolge.
 * - Angewendete Migrationen stehen in `schema_migrations`; jede läuft in einer Transaktion.
 * - Bestandsdatenbanken stammen aus der Zeit vor dem Tracking: Die Migrationen 001–003 sind
 *   idempotent (`IF NOT EXISTS`) und laufen einfach erneut. Migration 004 (`ALTER TABLE ADD COLUMN`)
 *   ist es nicht – die Spalte kann dort bereits durch den früheren Startup-Code existieren.
 *   Ein "duplicate column name"-Fehler gilt deshalb als bereits angewendet.
 */

export function defaultMigrationsDir(): string {
  return path.join(__dirname, '..', '..', 'migrations');
}

function isDuplicateColumnError(error: unknown): boolean {
  return error instanceof Error && /duplicate column name/i.test(error.message);
}

/** Wendet ausstehende Migrationen an und gibt deren Namen zurück. */
export function runMigrations(db: Database.Database, migrationsDir: string): string[] {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrationsverzeichnis nicht gefunden: ${migrationsDir}`);
  }

  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name TEXT PRIMARY KEY,
       applied_at DATETIME NOT NULL DEFAULT (datetime('now'))
     )`
  );

  const done = new Set(
    (db.prepare('SELECT name FROM schema_migrations').all() as { name: string }[]).map(r => r.name)
  );
  const record = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)');
  const applied: string[] = [];

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (done.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      db.transaction(() => {
        db.exec(sql);
        record.run(file);
      })();
    } catch (error) {
      if (!isDuplicateColumnError(error)) throw error;
      record.run(file);
    }
    applied.push(file);
  }

  return applied;
}

// CLI: `npm run migrate` (nach `npm run build`)
if (require.main === module) {
  // Lazy import, damit das Modul ohne Seiteneffekte testbar bleibt.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initializeDatabase, closeDatabase } = require('./database') as typeof import('./database');
  initializeDatabase();
  closeDatabase();
}
