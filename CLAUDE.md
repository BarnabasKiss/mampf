# Mampf – Hinweise für Claude Code

Deutschsprachige PWA (Einkaufsliste, Gerichte, Wochenplan). Express + SQLite im Backend, Vanilla-JS-Module (ohne Build) im Frontend. Details: `README.md`, `docs/architecture.md`, `docs/development.md`.

## Befehle
- `npm run typecheck` · `npm run build` · `npm test` – vor jedem Abschluss alle drei ausführen.
- Server lokal: `.env` aus `.env.example`, dann `npm run build && npm start`. `APP_USERNAME`, `APP_PASSWORD`, `SESSION_SECRET` sind Pflicht.

## Regeln
- UI-Texte, Fehlermeldungen, Kommentare, Doku: Deutsch. Bezeichner: Englisch.
- Standardansicht ist die **Einkaufsliste** (`DEFAULT_TAB` in `src/client/js/tabs.js`).
- Abmelden und alle Löschaktionen laufen über `confirmDialog()` (`js/dom.js`) – keine neuen `confirm()`/Einzel-Modals.
- Kein `innerHTML` mit Nutzerdaten; `el()`/`render()` verwenden.
- Löschen-Buttons sind Outline (rot umrandet), nie vollflächig rot.
- Dialoge schließen nicht per Klick daneben (bewusst, wegen iOS).
- Neue Client-Datei oder neues Asset ⇒ in `APP_SHELL` in `src/client/sw.js` eintragen und `CACHE_NAME` erhöhen.
- DB-Änderungen nur über neue Migrationen (`migrations/00N-*.sql`), ausgelieferte nie ändern.
- Router: feste Pfade vor `/:id`. API-Antwortformen nicht still ändern.
- Reine Logik bekommt Tests (`*.test.ts` am Server, `js/domain.test.mjs` im Client).
- Das **Anna-Theme** (`src/client/anna/`) ist strikt getrennt: nur über `js/footer.js` einbinden, nichts davon in den Kern importieren (Ausnahme: `loadMealsIntoPlan` in `plan.js`). Neue Optik gehört in `anna.css` unter `html[data-anna]`; neue Sprüche in `phrases.js`. Siehe `docs/anna-theme.md`.
- Nicht committen/pushen ohne ausdrückliche Anweisung.
