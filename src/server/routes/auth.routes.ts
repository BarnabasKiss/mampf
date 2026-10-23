import { Router } from 'express';
import { AppConfig } from '../config';
import { verifyCredentials } from '../auth';
import { route } from '../http/helpers';
import { FailureRateLimiter } from '../rate-limit';
import { asBody } from '../validation/common';

export const SESSION_COOKIE_NAME = 'connect.sid';

export function createAuthRouter(config: AppConfig, limiter: FailureRateLimiter): Router {
  const router = Router();

  // POST /api/login
  router.post('/login', route('Fehler bei der Anmeldung.', (req, res) => {
    const key = req.ip ?? 'unknown';

    if (limiter.isBlocked(key)) {
      res.setHeader('Retry-After', String(limiter.retryAfterSeconds(key)));
      res.status(429).json({ error: 'Zu viele fehlgeschlagene Versuche. Bitte später erneut versuchen.' });
      return;
    }

    const { username, password } = asBody(req.body);
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich.' });
      return;
    }

    if (!verifyCredentials(config, username, password)) {
      limiter.recordFailure(key);
      res.status(401).json({ error: 'Ungültiger Benutzername oder Passwort.' });
      return;
    }

    limiter.reset(key);
    req.session.authenticated = true;
    req.session.username = username;
    res.json({ success: true, username });
  }));

  // POST /api/logout
  router.post('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        res.status(500).json({ error: 'Fehler beim Abmelden.' });
        return;
      }
      res.clearCookie(SESSION_COOKIE_NAME);
      res.json({ success: true });
    });
  });

  // GET /api/session
  router.get('/session', (req, res) => {
    if (req.session?.authenticated) {
      res.json({ authenticated: true, username: req.session.username });
    } else {
      res.json({ authenticated: false });
    }
  });

  return router;
}
