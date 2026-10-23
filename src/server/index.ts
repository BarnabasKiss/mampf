import express, { Express } from 'express';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { AppConfig, ConfigError, loadConfig } from './config';
import { closeDatabase, getDatabase, initializeDatabase } from './database';
import { FailureRateLimiter } from './rate-limit';
import { SqliteSessionStore } from './session-store';
import { createAuthRouter } from './routes/auth.routes';
import mealsRoutes from './routes/meals.routes';
import shoppingRoutes from './routes/shopping.routes';

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Frontend-Verzeichnis: `dist/client` (Build/Docker), sonst `src/client` (Entwicklung). */
function resolveClientPath(): string {
  const dist = path.join(__dirname, '..', 'client');
  return fs.existsSync(dist) ? dist : path.join(__dirname, '..', '..', 'src', 'client');
}

export interface MampfApp {
  app: Express;
  /** Stoppt Hintergrund-Timer (Session-Cleanup). */
  dispose(): void;
}

export function createApp(config: AppConfig): MampfApp {
  initializeDatabase();

  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy !== undefined) {
    app.set('trust proxy', config.trustProxy);
  }

  // Health-Check ohne Session/Auth (Docker-Healthcheck)
  app.get('/healthz', (_req, res) => {
    try {
      getDatabase().prepare('SELECT 1').get();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'error' });
    }
  });

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });

  app.use(express.json());

  const store = new SqliteSessionStore();
  store.startCleanup();

  app.use(session({
    store,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: config.cookieSecure,
      maxAge: TEN_YEARS_MS, // kein automatischer Logout
    },
  }));

  const loginLimiter = new FailureRateLimiter({ maxAttempts: LOGIN_MAX_ATTEMPTS, windowMs: LOGIN_WINDOW_MS });
  app.use('/api', createAuthRouter(config, loginLimiter));
  app.use('/api/meals', mealsRoutes);
  app.use('/api/shopping-list', shoppingRoutes);

  const clientPath = resolveClientPath();
  app.use(express.static(clientPath));

  // SPA-Fallback für alle Nicht-API-Pfade
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  return { app, dispose: () => store.stopCleanup() };
}

function main(): void {
  let config: AppConfig;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`Konfigurationsfehler: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  const { app, dispose } = createApp(config);
  const server = app.listen(config.port, () => {
    console.log(`Mampf Server läuft auf http://localhost:${config.port}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} empfangen – fahre herunter.`);
    server.close(() => {
      dispose();
      closeDatabase();
      process.exit(0);
    });
    // Falls Keep-Alive-Verbindungen das Schließen blockieren
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  main();
}
