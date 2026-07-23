import { Request, Response, NextFunction } from 'express';

const VALID_USERNAME = process.env.APP_USERNAME || 'admin';
const VALID_PASSWORD = process.env.APP_PASSWORD || 'admin';

declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
    username: string;
  }
}

export function verifyPassword(password: string): boolean {
  if (!VALID_PASSWORD) {
    console.warn('APP_PASSWORD ist nicht gesetzt! Authentifizierung nicht möglich.');
    return false;
  }
  return password === VALID_PASSWORD;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Nicht authentifiziert.' });
  }
}

export function isAuthenticated(req: Request): boolean {
  return req.session?.authenticated === true;
}

export function getConfiguredUsername(): string {
  return VALID_USERNAME;
}