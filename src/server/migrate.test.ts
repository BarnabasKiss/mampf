import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { defaultMigrationsDir, runMigrations } from './migrate';

function columns(db: Database.Database, table: string): string[] {
  return (db.pragma(`table_info(${table})`) as { name: string }[]).map(c => c.name);
}

test('runMigrations: frische DB, zweiter Lauf ist ein No-op', () => {
  const db = new Database(':memory:');
  const applied = runMigrations(db, defaultMigrationsDir());
  assert.ok(applied.length >= 4);
  assert.ok(columns(db, 'shopping_list_items').includes('category_id'));

  assert.deepEqual(runMigrations(db, defaultMigrationsDir()), []);
  const count = (db.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get() as { c: number }).c;
  assert.equal(count, applied.length);
});

test('runMigrations: Bestands-DB mit bereits vorhandener Spalte', () => {
  const db = new Database(':memory:');
  const dir = defaultMigrationsDir();
  // Zustand vor dem Tracking: 001–003 gelaufen, Spalte per altem Startup-Code ergänzt.
  for (const file of ['001-initial.sql', '002-shopping-list.sql', '003-categories.sql']) {
    db.exec(fs.readFileSync(path.join(dir, file), 'utf-8'));
  }
  db.exec('ALTER TABLE shopping_list_items ADD COLUMN category_id INTEGER');
  db.prepare("INSERT INTO shopping_list_items (name, amount, category_id) VALUES ('Milch', '1', 7)").run();

  const applied = runMigrations(db, dir);
  assert.ok(applied.includes('004-shopping-item-category.sql'));
  const recorded = db.prepare("SELECT 1 FROM schema_migrations WHERE name = '004-shopping-item-category.sql'").get();
  assert.ok(recorded);
  const row = db.prepare('SELECT category_id FROM shopping_list_items').get() as { category_id: number };
  assert.equal(row.category_id, 7);
});

test('runMigrations: fehlerhafte Migration wird zurückgerollt und nicht protokolliert', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mampf-mig-'));
  try {
    fs.writeFileSync(path.join(dir, '001-bad.sql'), 'CREATE TABLE t (id INTEGER); INSERT INTO missing VALUES (1);');
    const db = new Database(':memory:');
    assert.throws(() => runMigrations(db, dir));
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name = 't'").get(), undefined);
    assert.equal((db.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get() as { c: number }).c, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('runMigrations: fehlendes Verzeichnis', () => {
  assert.throws(() => runMigrations(new Database(':memory:'), '/does/not/exist'), /nicht gefunden/);
});
