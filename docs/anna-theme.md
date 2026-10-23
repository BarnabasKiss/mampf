# Anna-Theme

Ein verspieltes, **vollständig getrenntes** Theme für Leute, die beim Essen eher nach Gefühl als nach Logik entscheiden: Jahreszeiten- und Feiertags-Looks, fallende Blüten und Blätter, ein Maskottchen („Mampfi“), Konfetti, ein „Bauchgefühl“-Automat für den Wochenplan und ein paar versteckte Überraschungen. Die App bleibt dabei voll bedienbar – das Theme ändert nur Optik und fügt kleine Extras hinzu, es ersetzt keine Funktionen.

## Ein- und Ausschalten

| Weg | Wirkung |
|---|---|
| Schalter **„Anna-Modus“** ganz unten in der Fußzeile | An/aus; die Wahl wird pro Gerät im `localStorage` (`mampf.anna`) gespeichert |
| Link `https://…/?anna=1` | schaltet das Theme ein (praktisch zum Verschicken) und entfernt den Parameter aus der Adresse |
| Link `https://…/?anna=0` | schaltet es aus |

Ist es an, erscheinen in der Fußzeile weitere Einstellungen: **Jahreszeit** (Automatisch oder fest, auch Anlässe zur Vorschau), **Animationen** an/aus, **Mampfi** an/aus und „Mampfi zurückholen“ (setzt seine Position zurück). Ohne eigene Einstellung folgen die Animationen der Systemeinstellung „Bewegung reduzieren“.

## Jahreszeiten und Anlässe

Automatisch nach Datum; ein Anlass hat Vorrang vor der Jahreszeit.

| Look | Wann | Besonderheiten |
|---|---|---|
| Frühling 🌸 | März–Mai | Blüten fallen, Schmetterlinge schweben |
| Sommer ☀️ | Juni–August | Bienen, Seifenblasen, Sonnenblumen; Mampfi mit Sonnenbrille |
| Herbst 🍂 | September–November | Blätter, Kastanien; Mampfi mit Blatt |
| Winter ❄️ | Dezember–Februar | Schneefall; Mampfi mit Mütze |
| Valentinstag 💕 | 13.–14. Februar | steigende Herzen |
| Ostern 🐰 | Palmsonntag bis Ostermontag (berechnet) | Eier, Küken; Mampfi mit Hasenohren |
| Halloween 🎃 | 25. Oktober–1. November | immer dunkel, lila/orange; Mampfi mit Hexenhut |
| Weihnachten 🎄 | 1.–26. Dezember | Schnee, Geschenke; Weihnachtsmütze |
| Silvester 🥂 | 31. Dezember–1. Januar | Feuerwerk, Partyhut |
| Geburtstag 🎂 | optional (siehe unten) | Ballons, Konfetti |

Jeder Look setzt eine eigene Palette (Hell- und Dunkelmodus werden mitgeführt), ein Hintergrundmuster, das Haken-Symbol der Einkaufsliste und die Partikel.

## Was sich verändert

- **Optik:** Schriften Fredoka (Text) und Caveat (Handschrift), Wellenkante unter der Kopfzeile, Karten als „Sticker“ mit Washi-Tape, Einkaufsliste als Notizblock mit Ringbindung, weiche Buttons zum „Eindrücken“, hüpfende Dialoge, schwebende Tab-Leiste am Handy, Sync-Anzeige als schlagendes Herz.
- **Haken:** Beim Abhaken blüht das Symbol der Jahreszeit auf (🌸, 🍂, ❄️ …) und es gibt Konfetti; erledigte Artikel werden wellig durchgestrichen.
- **Schwierigkeit mit Gefühl:** „Einfach/Mittel/Schwer“ heißt im Theme „Schnell & leicht“, „Wohlfühl-Klassiker“, „Heute wird gezaubert“ (nur Anzeige, die Daten bleiben unverändert).
- **Mampfi:** blinzelt, folgt dem Finger/Zeiger mit den Augen, kommentiert Aktionen (abhaken, löschen, Wochenplan, Wörter wie „Pizza“ oder „Schokolade“), gähnt nach 45 s Ruhe und schläft nach 90 s. Lässt sich per Ziehen verschieben (Position wird gemerkt).
- **Bauchgefühl 🎰** (Wochenplan): Stimmung wählen („Schnell & leicht“, „Wohlfühl-Klassiker“, „Heute wird gezaubert“ oder egal), dann drehen drei Walzen und landen bei drei Gerichten; „Das nehm ich!“ übernimmt sie in den Wochenplan. Die Stimmung filtert nach der Schwierigkeit des Gerichts.

## Easter Eggs (Spoiler!)

- 7× schnell auf Mampfi tippen → **Party** (Konfetti, Feuerwerk, tanzende Mampfi, Regenbogen-Kopfzeile)
- Konami-Code (↑ ↑ ↓ ↓ ← → ← → B A) oder 3× auf das Sync-Herz → **Heißhunger-Modus** (Essen-Regen)
- „anna“ tippen (außerhalb von Eingabefeldern) → Herzenregen; „mampf“ → Mampfi isst
- 5× aufs Logo → die Schüssel läuft über
- 5× auf „Mit Liebe gekocht“ in der Fußzeile → Liebesbrief (`LOVE_NOTE`)
- Alle Artikel abgehakt → Feuerwerk
- Gerät schütteln (Android) → Mampfi wird schwindelig
- Mausspur aus Funken am Desktop; Tipp auf freie Flächen → kleine Funken

## Anpassen

Persönliches steht in `src/client/anna/config.js` und `phrases.js`:

- `BIRTHDAY = { month: 12, day: 24 }` aktiviert den Geburtstags-Look samt Gruß am jeweiligen Tag (Standard `null`).
- `LOVE_NOTE` – Text des Liebesbriefs.
- `THEMES` – Partikel, Haken- und Leer-Symbol, Outfit je Look.
- `phrases.js` – alle Sprüche von Mampfi, Stichwort-Reaktionen (`KEYWORDS`) und Bauchgefühl-Texte.

Neuen Look anlegen: Schlüssel in `THEMES` und `THEME_ORDER` ergänzen, Palette `html[data-anna-key='…']` in `anna.css` definieren (weißer Text auf `--anna-a` und `--anna-b` ≥ 4,5:1), ggf. Anlass-Datum in `season.js` (`getSpecial`) und ein Outfit-`<g>` in `mascot.js` samt `[data-outfit]`-Regel.

## Aufbau und Trennung

```
src/client/anna/
  anna.js      enableAnna()/disableAnna(): setzt alles auf und baut es rückstandslos wieder ab
  anna.css     gesamte Optik, gekapselt unter html[data-anna]
  config.js    Looks, Partikel, Geburtstag, Liebesbrief
  season.js    Jahreszeiten, Anlässe, Ostern – reine Funktionen (season.test.mjs)
  effects.js   Partikel, Konfetti, Feuerwerk, Regen, Funkenspur
  mascot.js    Mampfi (SVG, Stimmungen, Outfits, Sprechblase, Ziehen)
  slot.js      „Bauchgefühl“-Automat
  eggs.js      Easter Eggs und Reaktionen
  phrases.js   Texte
  fonts/       Fredoka, Caveat (SIL Open Font License)
```

Der Kern kennt das Theme nur an wenigen Stellen:

- `js/footer.js` – Schalter in der Fußzeile; lädt `/anna/anna.js` per dynamischem `import()` erst beim Einschalten.
- `js/anna-settings.js` – Einstellungen im `localStorage`.
- `js/theme-init.js` – setzt früh `data-anna` und lädt `anna.css`, damit beim Neuladen nichts im falschen Look aufblitzt; wertet `?anna=1|0` aus.
- `js/plan.js` – exportiert `loadMealsIntoPlan()` für den Automaten.

Nicht eingeschaltet kostet das Theme nichts: kein Download, kein Code. Beim Ausschalten werden Stylesheet, Elemente, Listener, Timer, CSS-Variablen und ersetzte Texte (Login-Untertitel, Fußzeile) wieder entfernt.

## Barrierefreiheit und Leistung

- Partikel- und Effektebenen haben `pointer-events: none` und `aria-hidden`; die App bleibt bedienbar.
- „Bewegung reduzieren“ (Systemeinstellung) oder der Schalter „Animationen“ aus: keine Partikel, keine Animationen.
- Läuft der Tab im Hintergrund, pausieren die Animationen.
- 12 (Handy) bzw. 18 (Desktop) Partikel, reine CSS-Transforms.
- Die Paletten sind auf Kontrast ausgelegt; Hell-, Dunkel- und Systemmodus funktionieren in jedem Look.

## Testen

`node --test src/client/anna/*.test.mjs` (Jahreszeiten/Anlässe). Optisch: in der Fußzeile unter „Jahreszeit“ jeden Look einzeln ansehen; Hell/Dunkel mit dem Umschalter in der Kopfzeile.

## Entfernen

Ordner `src/client/anna/`, `js/footer.js`, `js/anna-settings.js` und die `anna`-Zeilen in `theme-init.js`, `main.js` (`initFooter`), `index.html` (Fußzeile) und `styles.css` (Fußzeilen-Block) löschen sowie `loadMealsIntoPlan` in `plan.js`.
