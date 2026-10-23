import session from 'express-session';
import { getDatabase } from './database';

/**
 * SQLite-Session-Store auf Basis von better-sqlite3.
 *
 * Sessions liegen in der Tabelle `sessions` (migrations/001-initial.sql) und überleben
 * damit Server-Neustarts. Schema: sessions ( sid TEXT PRIMARY KEY, expires TEXT, sess TEXT ),
 * `expires` enthält Millisekunden seit Epoche als Text.
 */

interface SessionRow {
  expires: string;
  sess: string;
}

type Callback = (err?: unknown) => void;

const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 60 * 1000;

function expiryMillis(sess: session.SessionData): number {
  return Date.now() + (sess?.cookie?.maxAge || DEFAULT_MAX_AGE);
}

export class SqliteSessionStore extends session.Store {
  private cleanupTimer: NodeJS.Timeout | undefined;

  /** Löscht abgelaufene Sessions regelmäßig; der Timer hält den Prozess nicht am Leben. */
  startCleanup(intervalMs: number = CLEANUP_INTERVAL): void {
    this.stopCleanup();
    this.deleteExpired();
    this.cleanupTimer = setInterval(() => this.deleteExpired(), intervalMs);
    this.cleanupTimer.unref();
  }

  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  deleteExpired(): number {
    return getDatabase()
      .prepare('DELETE FROM sessions WHERE CAST(expires AS INTEGER) < ?')
      .run(Date.now()).changes;
  }

  get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void): void {
    try {
      const row = getDatabase()
        .prepare('SELECT expires, sess FROM sessions WHERE sid = ?')
        .get(sid) as SessionRow | undefined;

      if (!row || parseInt(row.expires, 10) < Date.now()) {
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.sess));
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, sess: session.SessionData, callback?: Callback): void {
    try {
      getDatabase()
        .prepare('INSERT OR REPLACE INTO sessions (sid, expires, sess) VALUES (?, ?, ?)')
        .run(sid, String(expiryMillis(sess)), JSON.stringify(sess));
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: Callback): void {
    try {
      getDatabase().prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid: string, sess: session.SessionData, callback?: Callback): void {
    try {
      getDatabase()
        .prepare('UPDATE sessions SET expires = ? WHERE sid = ? AND CAST(expires AS INTEGER) >= ?')
        .run(String(expiryMillis(sess)), sid, Date.now());
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }
}
