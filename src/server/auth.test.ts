import test from 'node:test';
import assert from 'node:assert/strict';
import { safeEqual, verifyCredentials } from './auth';
import { FailureRateLimiter } from './rate-limit';
import { ConfigError, loadConfig } from './config';

test('safeEqual / verifyCredentials', () => {
  assert.ok(safeEqual('geheim', 'geheim'));
  assert.ok(!safeEqual('geheim', 'Geheim'));
  assert.ok(!safeEqual('a', 'aa'));

  const expected = { username: 'admin', password: 'pw' };
  assert.ok(verifyCredentials(expected, 'admin', 'pw'));
  assert.ok(!verifyCredentials(expected, 'admin', 'x'));
  assert.ok(!verifyCredentials(expected, 'x', 'pw'));
});

test('FailureRateLimiter sperrt nach maxAttempts und läuft ab', () => {
  let now = 1_000;
  const limiter = new FailureRateLimiter({ maxAttempts: 3, windowMs: 60_000, now: () => now });

  for (let i = 0; i < 3; i++) {
    assert.ok(!limiter.isBlocked('ip'));
    limiter.recordFailure('ip');
  }
  assert.ok(limiter.isBlocked('ip'));
  assert.ok(!limiter.isBlocked('andere-ip'));
  assert.equal(limiter.retryAfterSeconds('ip'), 60);

  now += 60_001;
  assert.ok(!limiter.isBlocked('ip'));
});

test('FailureRateLimiter.reset hebt die Sperre auf', () => {
  const limiter = new FailureRateLimiter({ maxAttempts: 1, windowMs: 1000 });
  limiter.recordFailure('ip');
  assert.ok(limiter.isBlocked('ip'));
  limiter.reset('ip');
  assert.ok(!limiter.isBlocked('ip'));
});

test('loadConfig: Pflichtvariablen und Parsing', () => {
  assert.throws(() => loadConfig({}), (err: unknown) =>
    err instanceof ConfigError && /APP_USERNAME, APP_PASSWORD, SESSION_SECRET/.test(err.message));

  const config = loadConfig({
    APP_USERNAME: 'u', APP_PASSWORD: 'p', SESSION_SECRET: 's',
    PORT: '8080', COOKIE_SECURE: 'true', TRUST_PROXY: '1',
  });
  assert.equal(config.port, 8080);
  assert.equal(config.cookieSecure, true);
  assert.equal(config.trustProxy, 1);

  const defaults = loadConfig({ APP_USERNAME: 'u', APP_PASSWORD: 'p', SESSION_SECRET: 's' });
  assert.equal(defaults.port, 3000);
  assert.equal(defaults.cookieSecure, false);
  assert.equal(defaults.trustProxy, undefined);

  assert.throws(() => loadConfig({ APP_USERNAME: 'u', APP_PASSWORD: 'p', SESSION_SECRET: 's', PORT: 'x' }), ConfigError);
});
