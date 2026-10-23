# 🍲 Mampf

Mampf ist eine deutschsprachige Web-App (PWA) für den Haushalt: eine **gemeinsame Einkaufsliste**, eine **Gerichte-Sammlung** und ein **Wochenplan**, der Zutaten pro Portion hochrechnet und direkt auf die Einkaufsliste oder per WhatsApp-Text weitergegeben werden kann.

## Funktionen

| Bereich | Was geht |
|---|---|
| **Einkaufsliste** (Startansicht) | Kategorien anlegen/umbenennen/löschen und ein-/ausklappen, Zeilen direkt bearbeiten, abhaken, Abgehakte löschen, Live-Synchronisierung zwischen Geräten (Polling), Vorlagen speichern/verwalten/anwenden |
| **Gerichte** | Anlegen, bearbeiten, duplizieren, löschen, durchsuchen; Zutaten in Packungen, Schwierigkeit 1–3, Standardportionen |
| **Wochenplan** | 3 zufällige Gerichte, einzelne ersetzen/entfernen/ergänzen, Portionen anpassen (Mengen werden aufgerundet), WhatsApp-Text kopieren, Zutaten zur Einkaufsliste hinzufügen; bleibt nach einem App-Neustart erhalten |
| **PWA** | Installierbar, offlinefähige App-Shell, Dunkelmodus, Tab-Leiste unten auf dem Handy |
| **Sicherheit** | Session-Login, Login-Limit, Abmelden nur nach Bestätigung |

## Schnellstart

Voraussetzung: Node.js ≥ 20.

```bash
npm install
cp .env.example .env        # APP_USERNAME, APP_PASSWORD, SESSION_SECRET setzen
npm run build
npm start                   # → http://localhost:3000
```

## Konfiguration

Alle Einstellungen laufen über Umgebungsvariablen (lokal: `.env`).

| Variable | Pflicht | Standard | Beschreibung |
|---|---|---|---|
| `APP_USERNAME` | ✅ | – | Benutzername für den Login |
| `APP_PASSWORD` | ✅ | – | Passwort (Klartext in der Umgebung, Vergleich zeitkonstant) |
| `SESSION_SECRET` | ✅ | – | Geheimnis zum Signieren der Session, z. B. `openssl rand -hex 32` |
| `PORT` | | `3000` | HTTP-Port |
| `DATABASE_PATH` | | `./data/meals.sqlite` | Pfad zur SQLite-Datei (im Container `/app/data/meals.sqlite`) |
| `COOKIE_SECURE` | | `false` | `true`, sobald die App über HTTPS läuft – sonst wird das Cookie nicht gesendet |
| `TRUST_PROXY` | | leer | z. B. `1` hinter genau einem Reverse Proxy, damit das Login-Limit die echte Client-IP sieht |

> Ohne `APP_USERNAME`, `APP_PASSWORD` und `SESSION_SECRET` startet der Server nicht (es gibt bewusst keine Standardwerte).

## Deployment mit Docker

Bei jedem Push auf `main` baut GitHub Actions das Image und veröffentlicht es als `ghcr.io/barnabaskiss/mampf:latest` – **nachdem** Typprüfung, Build und Tests grün waren.

```bash
mkdir -p data && chown 1000:1000 data     # Container läuft als Benutzer "node" (UID 1000)
export APP_USERNAME=admin APP_PASSWORD=… SESSION_SECRET=$(openssl rand -hex 32)
docker compose up -d
```

- Daten liegen im Volume `./data` (SQLite, WAL). **Das Verzeichnis einfach sichern.**
- `GET /healthz` dient als Healthcheck (ohne Login).
- Lokal bauen statt GHCR-Image: in `docker-compose.yml` `image:` auskommentieren und `build: .` aktivieren.
- Hinter einem Reverse Proxy mit HTTPS: `COOKIE_SECURE=true` und `TRUST_PROXY=1` setzen.

### Hinweis für bestehende Installationen

Gegenüber früheren Versionen gilt jetzt:

- Pflicht-Variablen: Fehlt eine, bricht der Start mit einer klaren Meldung ab (früher: Standardwerte `admin`/`change-me-in-production`).
- Der Container läuft nicht mehr als root. Ein bestehendes `./data`-Verzeichnis muss für UID 1000 schreibbar sein: `chown -R 1000:1000 data`.
- Migrationen werden jetzt in der Tabelle `schema_migrations` nachgehalten; bestehende Datenbanken werden automatisch übernommen.

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run build` | Server (TypeScript → `dist/`) bauen und Client nach `dist/client` kopieren |
| `npm start` / `npm run start:prod` | Server starten (mit bzw. ohne `.env`-Datei) |
| `npm run dev` | Bauen und mit Watch-Modus starten |
| `npm run typecheck` | Typprüfung |
| `npm test` | Server- und Client-Tests |
| `npm run migrate` | Datenbank-Migrationen manuell ausführen |

## Weiterführende Doku

- [Architektur](docs/architecture.md) – Aufbau, Datenmodell, API
- [Entwicklung](docs/development.md) – Konventionen, Tests, Migrationen, PWA/Icons, Release
- [CLAUDE.md](CLAUDE.md) – Kurzleitfaden für die Arbeit mit Claude Code

## Lizenzen

Die Icons in `src/client/icons/sprite.svg` stammen aus [Ionicons](https://ionic.io/ionicons) (MIT).
