# Architektur

Mampf ist bewusst klein gehalten: ein Express-Server mit SQLite und ein Client aus Vanilla-JavaScript-Modulen **ohne Build-Schritt und ohne Framework**.

```
Browser (PWA)  ──HTTP/JSON──▶  Express (src/server)  ──▶  SQLite (better-sqlite3, WAL)
   ES-Module                    Sessions, Routen, Services
```

## Verzeichnisse

```
src/server/
  index.ts            createApp(config) + Start; Graceful Shutdown
  config.ts           Env-Variablen lesen/validieren (Fail-fast)
  auth.ts             Zeitkonstanter Passwortvergleich, requireAuth
  rate-limit.ts       Login-Limit (10 Fehlversuche / 15 min / IP, im Speicher)
  database.ts         Verbindung (Foreign Keys, WAL)
  migrate.ts          Migrations-Runner (schema_migrations, je Migration eine Transaktion)
  session-store.ts    SQLite-Session-Store, räumt stündlich Abgelaufenes auf
  http/helpers.ts     parseId, route() mit zentraler 500-Behandlung
  validation/         Reine Validatoren (Gerichte, Einkauf, Vorlagen)
  routes/             Dünne HTTP-Schicht: auth, meals, shopping
  services/           Datenzugriff und Geschäftslogik
  *.test.ts           Tests direkt neben dem Code
src/client/
  index.html          Seite mit allen <dialog>-Elementen
  styles.css          Design-Tokens, Komponenten, Dunkelmodus, Mobil-Layout
  sw.js               Service Worker (App-Shell-Cache)
  manifest.json       PWA-Manifest
  icons/              App-Icon (SVG + PNGs) und sprite.svg (UI-Icons)
  js/
    main.js           Einstieg: verdrahtet Module, Login-Zustand
    api.js            fetch-Client; löst bei 401 das Event auth:expired aus
    dom.js            el()/render()/icon(), Toast, Dialoge, confirmDialog()
    domain.js         Reine Fachlogik (Mengenrechnung, WhatsApp-Text, Gruppierung) – getestet
    auth.js           Login, Logout mit Bestätigungs-Popup
    tabs.js           Tab-Navigation (Standard: Einkaufsliste)
    theme.js          Farbschema-Umschalter (Auto/Hell/Dunkel), theme-init.js setzt es vor dem Rendern
    shopping.js       Einkaufsliste, Kategorien, Polling
    templates.js      Einkaufslisten-Vorlagen
    meals.js          Gerichte
    plan.js           Wochenplan (Persistenz im localStorage)
    storage.js        Fehlertoleranter localStorage-Zugriff
    pull-to-refresh.js  Ziehen zum Aktualisieren (Touch)
  anna/               Optionales Anna-Theme (CSS, Maskottchen, Effekte) – siehe docs/anna-theme.md
migrations/           Nummerierte SQL-Dateien (001 … 004)
scripts/              copy-client.js (Build), run-tests.js
```

## Datenmodell

| Tabelle | Inhalt |
|---|---|
| `meals` | Gericht: Name, Schwierigkeit (1–3), Standardportionen |
| `ingredients` | Zutat eines Gerichts: Name, Packungsanzahl (REAL > 0), Reihenfolge; `ON DELETE CASCADE` |
| `shopping_categories` | Kategorien der Einkaufsliste (Reihenfolge); „Allgemein“ ist `category_id IS NULL` |
| `shopping_list_items` | Artikel: Name, Menge (Text), abgehakt, optional Kategorie |
| `shopping_templates`, `shopping_template_items` | Vorlagen und ihre Artikel |
| `sessions` | Login-Sessions (10 Jahre gültig, rollierend) |
| `schema_migrations` | Bereits angewendete Migrationen |

## API

Alle Routen außer Login, Session-Abfrage und `/healthz` verlangen eine Anmeldung (sonst `401`). Fehler: `{ "error": "…", "details": ["…"] }`.

**Auth** – `POST /api/login`, `POST /api/logout`, `GET /api/session`

**Gerichte** – `GET /api/meals[?search=]`, `GET /api/meals/random?count=&exclude=1,2`, `GET|PUT|DELETE /api/meals/:id`, `POST /api/meals`

**Einkaufsliste** (`/api/shopping-list`)
- Artikel: `GET /`, `POST /` (einzeln oder `{items:[…]}`), `PUT /:id`, `DELETE /:id`, `POST /clear-checked`, `POST /from-meals`
- Kategorien: `GET|POST /categories`, `PUT|DELETE /categories/:id` (die letzte Kategorie kann nicht gelöscht werden)
- Vorlagen: `GET|POST /templates`, `GET|PUT|DELETE /templates/:id`, `POST /templates/:id/apply`

**System** – `GET /healthz` (ohne Login, prüft die Datenbank)

> Feste Pfade (`/random`, `/templates`, `/categories`, …) müssen in den Routern **vor** `/:id` stehen.

## Client-Konzepte

- **Kein `innerHTML` mit Nutzerdaten.** Elemente entstehen über `el(tag, props, …children)`; Text wird immer als Textknoten eingefügt.
- **Dialoge** sind native `<dialog>`-Elemente (`openModal`/`closeModal`). Für Rückfragen gibt es **einen** generischen `confirmDialog({title, body, confirmLabel, danger})`, der ein Promise<boolean> liefert – genutzt für Abmelden und alle Lösch-Aktionen. Ein Klick neben den Dialog schließt ihn bewusst nicht.
- **Einkaufsliste:** Änderungen werden optimistisch angezeigt; Schreibzugriffe werden getrackt, damit ein Refresh sie nicht überholt. Gepollt wird alle 3 s, nur solange der Tab sichtbar ist, und nie, während in der Liste getippt wird.
- **Wochenplan** speichert nur Gericht-ID und Portionen im `localStorage` und gleicht sie beim Anzeigen mit den aktuellen Gerichten ab (gelöschte fallen heraus).
- **Rückgängig:** Gelöschte Artikel werden bei „Rückgängig“ neu angelegt (neue ID, gleiche Kategorie und Haken); `showToast` kann dafür einen Aktions-Button anzeigen. Ist die Kategorie inzwischen gelöscht, landet der Artikel in „Allgemein“.
- **Wischgesten** (`enableSwipe` in `shopping.js`): nur Touch; `touch-action: pan-y` lässt Scrollen zu, `touchmove` ist nicht-passiv und ruft `preventDefault()`, sobald die Geste als horizontales Wischen erkannt ist (sonst geht der nächste Tipp verloren).
- **Zutaten zusammenführen** passiert serverseitig (`addItemsFromMeals`): gleiche Namen ohne Beachtung der Groß-/Kleinschreibung, nur bei rein numerischen Mengen („2“ + „1“ = „3“); Mengen wie „500 g“ bleiben getrennt.
- **Sitzungsablauf:** Antwortet die API mit 401, zeigt die App automatisch den Login.
- **Events:** `auth:expired` (api → main), `meals:changed` (meals → plan).

## PWA

`sw.js` cached die App-Shell (Liste `APP_SHELL`), liefert statische Dateien aus dem Cache und aktualisiert sie im Hintergrund; Navigation geht zuerst ins Netz, API-Aufrufe nie in den Cache. **Neue Client-Datei oder geänderte Dateiliste ⇒ `CACHE_NAME` in `sw.js` hochzählen.**
