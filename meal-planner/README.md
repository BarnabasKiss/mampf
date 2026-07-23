# 🍽️ Mampf – Wochen-Essensplaner

Eine deutschsprachige Web-App zum Verwalten von Gerichten und Generieren eines Wochen-Essensplans. Zutatenmengen werden anhand der Portionen skaliert und können als WhatsApp-Text kopiert werden.

## Funktionen

- **Gerichte verwalten**: Erstellen, Bearbeiten, Duplizieren, Löschen und Durchsuchen von Gerichten mit Zutaten
- **Wochenplan generieren**: Zufällige Auswahl von 3 Gerichten, einzelne Gerichte ersetzen/entfernen/hinzufügen
- **Zufällig hinzufügen**: Ein zufälliges Gericht zum bestehenden Plan ergänzen
- **Portionsskalierung**: Zutatenmengen werden automatisch an die gewünschte Portionsanzahl angepasst
- **WhatsApp-Export**: Einkaufsliste als formatierter Text (mit Fettdruck) in die Zwischenablage kopieren
- **Mobile Optimierung**: Responsive UI mit Cards statt Tabelle auf kleinen Bildschirmen

## Technologie

- **Frontend**: HTML, CSS, Vanilla JavaScript, Ionicons
- **Backend**: Node.js mit TypeScript und Express
- **Datenbank**: SQLite (better-sqlite3)
- **Authentifizierung**: Session-basiert mit Benutzername/Passwort (Klartext)
- **Deployment**: Docker und Docker Compose
- **CI/CD**: GitHub Actions → GHCR

## Schnellstart (Entwicklung)

```bash
npm install

# .env-Datei erstellen (siehe .env.example)
cp .env.example .env
# Werte anpassen: APP_USERNAME, APP_PASSWORD, SESSION_SECRET

npm run build
npm start
```

→ http://localhost:3000

## Deployment via Docker Compose

### Lokal bauen

```bash
# .env-Datei erstellen
# APP_USERNAME=admin
# APP_PASSWORD=mein-passwort
# SESSION_SECRET=ein-langer-zufaelliger-string

docker compose up -d
```

### CasaOS / GHCR-Image verwenden

Das Image wird bei jedem Push auf `main` automatisch via GitHub Actions gebaut und nach **ghcr.io** gepusht.

```yaml
# docker-compose.yml für CasaOS:
services:
  meal-planner:
    image: ghcr.io/BarnabasKiss/mapfmapf/meal-planner:latest
    container_name: meal-planner
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      APP_USERNAME: admin
      APP_PASSWORD: mein-passwort
      SESSION_SECRET: ein-langer-zufaelliger-string
      DATABASE_PATH: /app/data/meals.sqlite
    volumes:
      - ./data:/app/data
```

## Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `APP_USERNAME` | Benutzername für die Anmeldung |
| `APP_PASSWORD` | Passwort im Klartext |
| `SESSION_SECRET` | Geheimer Schlüssel für die Session-Verschlüsselung |
| `PORT` | Port für den Webserver (Standard: 3000) |
| `DATABASE_PATH` | Pfad zur SQLite-Datenbank |

## Projektstruktur

```
meal-planner/
├── .github/workflows/
│   └── docker-build.yml     # CI/CD: Docker Build & Push nach GHCR
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