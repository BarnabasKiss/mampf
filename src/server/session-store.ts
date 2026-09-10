import session from 'express-session';
import { getDatabase } from './database';

/**
 * SQLite-Session-Store auf Basis von better-sqlite3.
 *
 * Sessions werden in der bestehenden `sessions`-Tabelle (migrations/001-initial.sql)
 * persistiert und überleben damit Server-Neustarts – die Nutzer bleiben eingeloggt,
 * auch wenn der Container neu gestartet wird.
 *
 * Tabellenschema: sessions ( sid TEXT PRIMARY KEY, expires TEXT, sess TEXT )
 */

interface SessionRow {
  expires: string;
  sess: string;
}

const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000; // 1 Tag (Fallback, falls kein maxAge)

// Sicherstellen, dass die Session-Tabelle existiert.
// In der normalen Server-Reihenfolge wird sie durch die Migrationen angelegt
// (migrations/001-initial.sql), aber der Store ist damit auch unabhängig davon nutzbar.
let tableEnsured = false;

function ensureTable(): void {
  if (tableEnsured) return;
  getDatabase().exec(
    'CREATE TABLE IF NOT EXISTS sessions (' +
      'sid TEXT PRIMARY KEY, ' +
      'expires TEXT, ' +
      'sess TEXT' +
      ')'
  );
  tableEnsured = true;
}

function expiryMillis(sess: session.SessionData): number {
  const maxAge = sess?.cookie?.maxAge;
  const ttl = maxAge ? maxAge : DEFAULT_MAX_AGE;
  return Date.now() + ttl;
}

export class SqliteSessionStore extends session.Store {
  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    try {
      ensureTable();
      const row = getDatabase()
        .prepare('SELECT expires, sess FROM sessions WHERE sid = ?')
        .get(sid) as SessionRow | undefined;

      if (!row) {
        callback(null, null);
        return;
      }
      // Abgelaufene Sessions wie "nicht vorhanden" behandeln.
      if (parseInt(row.expires, 10) < Date.now()) {
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.sess));
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    try {
      ensureTable();
      getDatabase()
        .prepare('INSERT OR REPLACE INTO sessions (sid, expires, sess) VALUES (?, ?, ?)')
        .run(sid, String(expiryMillis(sess)), JSON.stringify(sess));
      if (callback) callback();
    } catch (err) {
      if (callback) callback(err);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    try {
      ensureTable();
      getDatabase().prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      if (callback) callback();
    } catch (err) {
      if (callback) callback(err);
    }
  }

  touch(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    try {
      ensureTable();
      getDatabase()
        .prepare('UPDATE sessions SET expires = ? WHERE sid = ? AND expires >= ?')
        .run(String(expiryMillis(sess)), sid, String(Date.now()));
      if (callback) callback();
    } catch (err) {
      if (callback) callback(err);
    }
  }
}
