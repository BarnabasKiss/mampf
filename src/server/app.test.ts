import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { createApp } from './index';
import { closeDatabase } from './database';

const config = {
  username: 'tester',
  password: 'pw-123',
  sessionSecret: 'test-secret',
  port: 0,
  cookieSecure: false,
  trustProxy: undefined,
};

let server: Server;
let base: string;
let dispose: () => void;

before(async () => {
  process.env.DATABASE_PATH = ':memory:';
  const created = createApp(config);
  dispose = created.dispose;
  server = created.app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  dispose();
  await new Promise<void>(resolve => server.close(() => resolve()));
  closeDatabase();
});

interface Reply<T = any> { status: number; body: T; cookie?: string }

async function call(method: string, path: string, body?: unknown, cookie?: string): Promise<Reply> {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get('set-cookie')?.split(';')[0];
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined, cookie: setCookie };
}

test('healthz ist ohne Login erreichbar', async () => {
  const res = await call('GET', '/healthz');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('API verlangt Login', async () => {
  assert.equal((await call('GET', '/api/meals')).status, 401);
  assert.equal((await call('GET', '/api/shopping-list')).status, 401);
  assert.deepEqual((await call('GET', '/api/session')).body, { authenticated: false });
});

test('Login → Gerichte-CRUD → Einkaufsliste → Logout', async () => {
  const bad = await call('POST', '/api/login', { username: 'tester', password: 'falsch' });
  assert.equal(bad.status, 401);
  assert.equal((await call('POST', '/api/login', {})).status, 400);

  const login = await call('POST', '/api/login', { username: 'tester', password: 'pw-123' });
  assert.equal(login.status, 200);
  const cookie = login.cookie!;
  assert.ok(cookie);
  assert.deepEqual((await call('GET', '/api/session', undefined, cookie)).body, { authenticated: true, username: 'tester' });

  // Gerichte
  const invalid = await call('POST', '/api/meals', { name: '' }, cookie);
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, 'Validierungsfehler.');
  assert.ok(invalid.body.details.length > 0);

  const created = await call('POST', '/api/meals', {
    name: 'Pizza', difficulty: 2, standard_portions: 2, ingredients: [{ name: 'Teig', package_count: 1 }],
  }, cookie);
  assert.equal(created.status, 201);
  const id = created.body.id;

  assert.equal((await call('GET', `/api/meals/${id}`, undefined, cookie)).body.name, 'Pizza');
  assert.equal((await call('GET', '/api/meals/abc', undefined, cookie)).status, 400);
  assert.equal((await call('GET', '/api/meals/9999', undefined, cookie)).status, 404);
  assert.equal((await call('GET', '/api/meals?search=piz', undefined, cookie)).body.length, 1);
  assert.equal((await call('GET', '/api/meals/random?count=1', undefined, cookie)).body.length, 1);

  const updated = await call('PUT', `/api/meals/${id}`, {
    name: 'Pizza Salami', difficulty: 3, standard_portions: 4, ingredients: [{ name: 'Salami', package_count: 2 }],
  }, cookie);
  assert.equal(updated.body.name, 'Pizza Salami');

  // Einkaufsliste
  const cat = await call('POST', '/api/shopping-list/categories', { name: 'Obst' }, cookie);
  assert.equal(cat.status, 201);
  const item = await call('POST', '/api/shopping-list', { name: 'Apfel', amount: '3', category_id: cat.body.id }, cookie);
  assert.equal(item.status, 201);
  assert.equal(item.body.category_id, cat.body.id);

  const checked = await call('PUT', `/api/shopping-list/${item.body.id}`, { name: 'Apfel', amount: '3', checked: 1 }, cookie);
  assert.equal(checked.body.checked, 1);
  assert.deepEqual((await call('POST', '/api/shopping-list/clear-checked', undefined, cookie)).body, { success: true, deleted: 1 });

  const tpl = await call('POST', '/api/shopping-list/templates', { name: 'T', items: [{ name: 'Milch' }] }, cookie);
  assert.equal(tpl.status, 201);
  assert.equal((await call('POST', `/api/shopping-list/templates/${tpl.body.id}/apply`, undefined, cookie)).status, 201);
  assert.equal((await call('POST', '/api/shopping-list/from-meals', { items: [] }, cookie)).status, 400);
  // Die letzte Kategorie ist geschützt (409); mit einer zweiten ist Löschen möglich.
  assert.equal((await call('DELETE', `/api/shopping-list/categories/${cat.body.id}`, undefined, cookie)).status, 409);
  await call('POST', '/api/shopping-list/categories', { name: 'Gemüse' }, cookie);
  assert.equal((await call('DELETE', `/api/shopping-list/categories/${cat.body.id}`, undefined, cookie)).status, 200);

  assert.equal((await call('DELETE', `/api/meals/${id}`, undefined, cookie)).status, 200);
  assert.equal((await call('DELETE', `/api/meals/${id}`, undefined, cookie)).status, 404);

  // Logout
  assert.equal((await call('POST', '/api/logout', undefined, cookie)).status, 200);
  assert.equal((await call('GET', '/api/meals', undefined, cookie)).status, 401);
});

test('Login wird nach zu vielen Fehlversuchen mit 429 gesperrt', async () => {
  let last = 0;
  for (let i = 0; i < 12; i++) {
    last = (await call('POST', '/api/login', { username: 'tester', password: `falsch${i}` })).status;
  }
  assert.equal(last, 429);
  // Auch korrekte Zugangsdaten sind während der Sperre abgewiesen.
  assert.equal((await call('POST', '/api/login', { username: 'tester', password: 'pw-123' })).status, 429);
});
