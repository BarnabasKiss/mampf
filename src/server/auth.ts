import { createHash, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
    username: string;
  }
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Zeitkonstanter Stringvergleich (über SHA-256-Hashes gleicher Länge). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/** Prüft beide Werte immer vollständig, damit die Laufzeit nichts über den Benutzernamen verrät. */
export function verifyCredentials(
  expected: { username: string; password: string },
  username: string,
  password: string
): boolean {
  const userOk = safeEqual(username, expected.username);
  const passOk = safeEqual(password, expected.password);
  return userOk && passOk;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Nicht authentifiziert.' });
  }
}
