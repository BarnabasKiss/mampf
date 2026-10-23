import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import session from 'express-session';
import { closeDatabase, getDatabase, initializeDatabase } from './database';
import { SqliteSessionStore } from './session-store';

before(() => {
  process.env.DATABASE_PATH = ':memory:';
  initializeDatabase();
});
after(() => closeDatabase());

const sessionData = (maxAge: number) =>
  ({ cookie: { maxAge, originalMaxAge: maxAge }, authenticated: true }) as unknown as session.SessionData;

function getAsync(store: SqliteSessionStore, sid: string): Promise<session.SessionData | null | undefined> {
  return new Promise((resolve, reject) => store.get(sid, (err, s) => (err ? reject(err) : resolve(s))));
}

test('Session-Store: set/get/destroy', async () => {
  const store = new SqliteSessionStore();
  store.set('s1', sessionData(60_000));
  assert.equal((await getAsync(store, 's1'))?.authenticated, true);
  store.destroy('s1');
  assert.equal(await getAsync(store, 's1'), null);
});

test('Session-Store: abgelaufene Sessions sind unsichtbar und werden aufgeräumt', async () => {
  const store = new SqliteSessionStore();
  store.set('alt', sessionData(60_000));
  store.set('neu', sessionData(60_000));
  getDatabase().prepare("UPDATE sessions SET expires = '1' WHERE sid = 'alt'").run();

  assert.equal(await getAsync(store, 'alt'), null);
  assert.equal(store.deleteExpired(), 1);
  assert.ok(await getAsync(store, 'neu'));
});
