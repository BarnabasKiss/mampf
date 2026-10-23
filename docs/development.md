# Entwicklung

## Einrichten

```bash
npm install
cp .env.example .env     # Pflichtwerte setzen
npm run dev              # baut und startet; neu bauen nach Änderungen
```

Der Client ist reines JavaScript/CSS/HTML unter `src/client` und wird beim Build nur nach `dist/client` kopiert. Für Client-Änderungen genügt `npm run build` (oder direkt `src/client` im Browser, wenn der Server den Ordner ausliefert) und ein Neuladen. Wegen des Service Workers einmal hart neu laden oder in den DevTools „Update on reload“ aktivieren.

## Qualität

```bash
npm run typecheck   # tsc ohne Ausgabe
npm test            # Server (node:test, In-Memory-SQLite, HTTP-Integrationstest) + Client-Domänenlogik + Anna-Jahreszeiten
```

CI (`.github/workflows/ci.yml`) führt Typecheck, Build und Tests bei Pull Requests und auf `main` aus; der Docker-Build (`docker-build.yml`) pusht nur nach grünen Tests.

### Konventionen

- Sprache: UI, Fehlermeldungen, Kommentare und Doku auf Deutsch; Bezeichner auf Englisch.
- Server: Validierung in `validation/` (reine Funktionen), Datenzugriff in `services/`, Routen nur als dünne Schicht mit `route()`/`parseId()`. Neue Logik bekommt einen Test neben der Datei (`*.test.ts`).
- Client: Fachlogik ohne DOM gehört in `domain.js` (mit Test in `domain.test.mjs`); UI-Code nutzt `el()`/`render()` statt HTML-Strings.
- Antwortformen der API nicht ohne Abstimmung ändern – der Client und gespeicherte Daten hängen daran.
- Zeilenenden: LF (`.gitattributes`).

## Datenbank-Migrationen

1. Neue Datei `migrations/00N-beschreibung.sql` mit der nächsthöheren Nummer anlegen.
2. Sie läuft beim Start automatisch einmal (Tabelle `schema_migrations`), in einer Transaktion.
3. Bereits ausgelieferte Migrationen **nie ändern**.
4. Ein Test in `src/server/migrate.test.ts` sichert das Verhalten bei Bestands-Datenbanken.

`npm run migrate` führt sie ohne Server aus.

## PWA-Icon und UI-Icons

- App-Icon: `src/client/icons/icon.svg` (Schüssel mit Dampf, volle Fläche, Inhalt in der Maskable-Safe-Zone). Daraus entstehen die PNGs `icon-32/192/512`, `icon-maskable-512` und `apple-touch-icon` (180 px), z. B. mit ImageMagick:
  ```bash
  cd src/client/icons
  magick -background none -density 384 icon.svg -resize 512x512 -alpha off PNG24:icon-512.png   # analog für 192, 180, 32
  cp icon-512.png icon-maskable-512.png
  ```
- UI-Icons: `src/client/icons/sprite.svg` enthält ausgewählte Ionicons als `<symbol id="i-…">`. Benutzt wird `icon('name')` in JS bzw. `<svg class="icon"><use href="/icons/sprite.svg#i-name"/></svg>` in HTML. Für ein neues Icon das `-outline`-SVG aus Ionicons als weiteres `<symbol>` ergänzen und in `sw.js` `CACHE_NAME` erhöhen.
- Dunkelmodus: Farben sind Tokens in `styles.css`. Der dunkle Satz steht **zweimal** (Systemeinstellung per `prefers-color-scheme` und manuell per `data-theme="dark"`) – beide Blöcke gleich halten. Die Wahl (Auto/Hell/Dunkel) liegt im `localStorage` unter `mampf.theme`.
- Theme-Farbe: `manifest.json` (`theme_color`) und die `theme-color`-Meta-Tags in `index.html` zusammen ändern.

## Release

Push auf `main` ⇒ CI ⇒ Image `ghcr.io/barnabaskiss/mampf:latest` (zusätzlich Tags für Branch und Commit). Auf dem Zielsystem `docker compose pull && docker compose up -d`.

## Fehlersuche

| Symptom | Ursache |
|---|---|
| Server startet nicht: „Fehlende Umgebungsvariable(n)“ | `APP_USERNAME`, `APP_PASSWORD` oder `SESSION_SECRET` fehlt |
| Container startet nicht, Schreibfehler auf `/app/data` | `chown 1000:1000 data` |
| Login klappt, wird aber sofort vergessen | `COOKIE_SECURE=true` ohne HTTPS (oder umgekehrt hinter einem Proxy fehlt `TRUST_PROXY`) |
| `429` beim Login | Login-Limit: 10 Fehlversuche pro 15 Minuten und IP |
| Nach einer Wischgeste reagiert der nächste Tipp nicht | `touchmove` im Swipe-Handler muss `{passive:false}` + `preventDefault()` behalten |
| Alte UI nach Update | Service-Worker-Cache: `CACHE_NAME` erhöhen, App neu laden |
