/**
 * Zentrale Laufzeit-Konfiguration aus Umgebungsvariablen.
 * Fehlende Pflichtwerte brechen den Start mit einer klaren Meldung ab.
 */

export interface AppConfig {
  username: string;
  password: string;
  sessionSecret: string;
  port: number;
  /** `secure`-Flag des Session-Cookies (nur hinter HTTPS aktivieren). */
  cookieSecure: boolean;
  /** Wert für Express' `trust proxy` (z.B. "1" hinter einem Reverse Proxy), sonst undefined. */
  trustProxy: boolean | number | string | undefined;
}

export class ConfigError extends Error {}

const REQUIRED = ['APP_USERNAME', 'APP_PASSWORD', 'SESSION_SECRET'] as const;

function parseTrustProxy(value: string | undefined): AppConfig['trustProxy'] {
  if (value === undefined || value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const asNumber = Number(value);
  return Number.isInteger(asNumber) ? asNumber : value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const missing = REQUIRED.filter(key => !env[key]);
  if (missing.length > 0) {
    throw new ConfigError(
      `Fehlende Umgebungsvariable(n): ${missing.join(', ')}. Siehe .env.example.`
    );
  }

  const port = parseInt(env.PORT || '3000', 10);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new ConfigError(`Ungültiger PORT: ${env.PORT}`);
  }

  return {
    username: env.APP_USERNAME!,
    password: env.APP_PASSWORD!,
    sessionSecret: env.SESSION_SECRET!,
    port,
    cookieSecure: env.COOKIE_SECURE === 'true',
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
  };
}
