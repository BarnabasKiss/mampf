# 🍽️ Mampf – Wochen-Essensplaner

Eine deutschsprachige Web-App zum Verwalten von Gerichten und Generieren eines Wochen-Essensplans. Zutatenmengen werden anhand der Portionen skaliert und können als WhatsApp-Text kopiert werden.

## Funktionen

- **Gerichte verwalten**: Erstellen, Bearbeiten, Löschen und Durchsuchen von Gerichten mit Zutaten
- **Wochenplan generieren**: Zufällige Auswahl von 3 Gerichten, einzelne Gerichte ersetzen/entfernen/hinzufügen
- **Portionsskalierung**: Zutatenmengen werden automatisch an die gewünschte Portionsanzahl angepasst
- **WhatsApp-Export**: Einkaufsliste als formatierter Text in die Zwischenablage kopieren

## Technologie

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js mit TypeScript und Express
- **Datenbank**: SQLite (better-sqlite3)
- **Authentifizierung**: Session-basiert mit Benutzername/Passwort
- **Deployment**: Docker und Docker Compose

## Schnellstart (Entwicklung)

```bash
# Abhängigkeiten installieren
npm install

# .env-Datei erstellen (siehe .env.example)
cp .env.example .env
# Passwort-Hash generieren:
# node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('dein-passwort', 10));"

# Bauen und starten
npm run build
npm start
```

Die App ist dann unter http://localhost:3000 erreichbar.

## Docker

```bash
# .env-Datei mit den Umgebungsvariablen erstellen
# (APP_USERNAME, APP_PASSWORD_HASH, SESSION_SECRET)

# Container bauen und starten
docker compose up -d

# Container stoppen
docker compose down
```

## Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `APP_USERNAME` | Benutzername für die Anmeldung |
| `APP_PASSWORD_HASH` | bcrypt-Hash des Passworts |
| `SESSION_SECRET` | Geheimer Schlüssel für die Session |
| `PORT` | Port für den Webserver (Standard: 3000) |
| `DATABASE_PATH` | Pfad zur SQLite-Datenbank |

## Projektstruktur

```
meal-planner/
├── src/
│   ├── server/
│   │   ├── index.ts          # Server-Einstiegspunkt
│   │   ├── database.ts       # Datenbank-Verbindung
│   │   ├── auth.ts           # Authentifizierung
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   └── meals.routes.ts
│   │   └── services/
│   │       └── meal.service.ts
│   └── client/
│       ├── index.html
│       ├── main.js           # Frontend-Logik
│       ├── styles.css
│       └── types.ts          # Typdefinitionen
├── migrations/
│   └── 001-initial.sql
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## API

### Authentifizierung
- `POST /api/login` – Anmeldung
- `POST /api/logout` – Abmeldung
- `GET /api/session` – Session-Status prüfen

### Gerichte
- `GET /api/meals` – Alle Gerichte (optional: `?search=`)
- `GET /api/meals/random?count=3&exclude=1,2` – Zufällige Gerichte
- `GET /api/meals/:id` – Einzelnes Gericht
- `POST /api/meals` – Gericht erstellen
- `PUT /api/meals/:id` – Gericht bearbeiten
- `DELETE /api/meals/:id` – Gericht löschen