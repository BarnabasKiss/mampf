import express from 'express';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './database';
import authRoutes from './routes/auth.routes';
import mealsRoutes from './routes/meals.routes';
import shoppingRoutes from './routes/shopping.routes';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';

// Body-Parser für JSON
app.use(express.json());

// Session-Konfiguration
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: false, // Bei HTTPS auf true setzen
    maxAge: 24 * 60 * 60 * 1000, // 24 Stunden
  },
}));

// API-Routen
app.use('/api', authRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/shopping-list', shoppingRoutes);

// Statische Dateien (Frontend) ausliefern
// In der Docker-Umgebung sind die Client-Dateien unter dist/client/
// In der Entwicklungsumgebung unter src/client/
const distClientPath = path.join(__dirname, '..', 'client');
const srcClientPath = path.join(__dirname, '..', '..', 'src', 'client');

let clientPath = distClientPath;
if (!fs.existsSync(clientPath)) {
  clientPath = srcClientPath;
}

app.use(express.static(clientPath));

// Fallback: Alle nicht-API-Routen liefern index.html aus (SPA-Verhalten)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientPath, 'index.html'));
  }
});

// Datenbank initialisieren und Server starten
initializeDatabase();

app.listen(PORT, () => {
  console.log(`Mampf Server läuft auf http://localhost:${PORT}`);
});

export default app;