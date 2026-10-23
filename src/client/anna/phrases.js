/** Texte des Maskottchens. Alles auf Deutsch, locker und liebevoll. */

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const GREETINGS = {
  morning: ['Guten Morgen, Anna! ☀️ Was gibt\'s zum Frühstück?', 'Moin! Erst Kaffee, dann Pläne ☕', 'Guten Morgen! Heute wird lecker 🥐'],
  noon: ['Mittagszeit! 🍝 Hast du Hunger?', 'Mhh, riecht schon nach Mittagessen…', 'Hunger-Alarm! Wonach ist dir?'],
  afternoon: ['Kaffee & Kuchen-Zeit? ☕🍰', 'Na, schon Lust auf was Süßes?', 'Zeit für einen kleinen Snack 🍪'],
  evening: ['Guten Abend, Anna! 🌙 Was kochen wir heute?', 'Abendbrot-Zeit! Worauf hast du Lust?', 'Gemütlich kochen? Ich bin dabei 🍲'],
  night: ['Psst… es ist schon spät 🌙 Ein Mitternachtssnack?', 'Schlaf gut – und träum was Leckeres 💤', '*gähn* Nur noch kurz was planen, ja?'],
};

export const SPECIAL_GREETINGS = {
  halloween: ['Buuuh! 🎃 Süßes oder Saures?', 'Gruselig lecker: Kürbissuppe! 👻'],
  christmas: ['Frohe Weihnachtszeit, Anna! 🎄 Plätzchen-Alarm!', 'Lebkuchen, Punsch… ich bin bereit 🎅'],
  easter: ['Frohe Ostern! 🐰 Ich hab was Leckeres versteckt…', 'Hoppel hoppel – Osterbrunch? 🥚'],
  valentine: ['Alles Liebe zum Valentinstag! 💕', 'Heute kochen wir mit extra viel Liebe 💖'],
  newyear: ['Frohes neues Jahr! 🥂 Auf viele leckere Momente!', 'Prost! 🎆 Gute Vorsätze: mehr Nachtisch.'],
  birthday: ['Alles Gute zum Geburtstag, Anna! 🎂🎈', 'Heute gibt\'s Kuchen. Ohne Diskussion. 🎉'],
};

export const SEASON_TIPS = {
  spring: ['Frühling! Zeit für Spargel & Erdbeeren 🍓', 'Kräuter vom Fensterbrett? 🌿', 'Die Blümchen blühen – und ich hab Hunger 🌸'],
  summer: ['Eis? Grillen? Beides! 🍦', 'Salat, Beeren, Sonne – perfekt ☀️', 'Zu heiß zum Kochen? Dann Wassermelone 🍉'],
  autumn: ['Kürbissuppe-Wetter! 🎃', 'Raschelnde Blätter, warme Suppe 🍂', 'Pilze, Maronen, Apfelkuchen… Herbst ist Genuss 🍄'],
  winter: ['Heiße Schokolade mit Marshmallows? 🍫', 'Eintopf wärmt die Seele ❄️', 'Plätzchen backen? Ich helfe beim Naschen 🍪'],
};

export const POKES = [
  'Hihi, das kitzelt! 🫢', 'Mampf mampf! 😋', 'Na, Hunger?', 'Du bist die Würze in meiner Brühe 💕',
  'Ich bin nur eine Schüssel, aber ich hab dich gern 🥣', 'Psst – tipp mich 7× schnell 👀', 'Was darf\'s denn sein?',
  'Ich hab Platz für Nachtisch!', 'Streicheln erlaubt ✨', 'Heute schon was Schönes gegessen?',
];

/** Reaktionen auf Wörter in Artikel- und Gerichtsnamen (Teilwort, ohne Groß-/Kleinschreibung). */
export const KEYWORDS = [
  [/pizza/, 'Pizza! 🍕 Mein Herz schlägt schneller.'],
  [/nutella/, 'Nutella?! 😍 Heimlich mitessen!'],
  [/schoko/, 'Schokolade 🍫 – unbedingt!'],
  [/kuchen|torte|muffin/, 'Kuchen?! Ich bin dabei 🍰'],
  [/eis\b|eiscreme|gelato/, 'Eis 🍦 geht immer.'],
  [/nudel|pasta|spaghetti|penne/, 'Pasta la vista! 🍝'],
  [/kaffee/, 'Kaffee ☕ – das Elixier des Lebens'],
  [/salat/, 'Knackig-frisch! 🥗'],
  [/suppe|eintopf/, 'Suppe wärmt die Seele 🍲'],
  [/apfel|äpfel/, 'Ein Apfel am Tag… 🍎'],
  [/erdbeer/, 'Erdbeeren 🍓 – Sommer im Mund'],
  [/kartoffel/, 'Kartoffeln 🥔 – die wahren Helden'],
  [/käse|kaese/, 'Käse 🧀 – mehr davon!'],
  [/brot|brötchen|semmel/, 'Frisches Brot 🥖 mmh!'],
  [/avocado/, 'Avocado 🥑 – fancy!'],
  [/banane/, 'Banane 🍌 – a-peeling!'],
  [/kürbis|kuerbis/, 'Kürbis 🎃 – Saison!'],
  [/wein|sekt/, 'Prost! 🍷'],
  [/milch/, 'Milch 🥛 für die Knochen'],
  [/tomate/, 'Tomaten 🍅 – rot und rund'],
  [/pommes/, 'Pommes 🍟 – ich liebe sie!'],
  [/gummibär|haribo|bonbon/, 'Naschkatze! 🍬'],
  [/keks|plätzchen/, 'Kekse 🍪 – Krümelmonster-Alarm!'],
];

export const CHECKED = ['Abgehakt! ✨', 'Yay! 🎈', 'Wieder einer weniger!', 'Läuft bei dir 😎', 'Check! 💪', 'Fein gemacht!'];
export const REMOVED = ['Tschüss, kleiner Artikel 👋', 'Weg damit!', 'Puff – verschwunden 💨'];
export const ALL_DONE = ['Alles erledigt! 🎉', 'Einkaufsliste leer – Hammer! 🥳', 'Fertig! Zeit für Kaffee ☕'];
export const AFTER_PLAN = ['Oh, das klingt lecker! 😋', 'Mhh, schöne Auswahl! 💕', 'Da läuft mir das Wasser im Mund zusammen…'];
export const TAB_TIPS = {
  'shopping-list': ['Was brauchen wir? 🛒', 'Liste auf, Haken bereit!'],
  meals: ['So viele Leckereien… 😍', 'Neues Lieblingsgericht? ✨'],
  'weekly-plan': ['Wonach ist dir heute? 🥰 Probier mal das Bauchgefühl!', 'Ab in den Wochenplan! 📅'],
};
export const SLEEPY = ['*gähn* … ob wir bald was essen? 🥱', 'Ich mach kurz die Augen zu… 😴'];
export const SHAKE = ['Huiii! Mir wird ganz schwindelig 🌀', 'Nicht schütteln – ich bin keine Suppe! 🍲'];
export const PARTY = ['PARTY! 🥳🎉', 'Wir feiern, dass es Essen gibt! 🎊'];
export const HUNGER = ['HEISSHUNGER-MODUS! 🍕🍩🍔', 'Alles auf einmal bitte! 🌮🍦🍰'];
export const ANNA_TYPED = ['Das bin ich nicht – das bist DU 💕', 'Anna! 💖 Hallo, Schöne!'];
export const MAMPF_TYPED = ['Mampf mampf mampf! 😋', 'Nom nom nom… 🍽️'];
export const SLOT = {
  intro: 'Wonach ist dir heute? Folg deinem Bauch! 🥰',
  empty: 'Lege erst ein paar Gerichte an, dann kann ich würfeln! 🎲',
  spinning: ['Dreh dreh dreh… 🎰', 'Der Bauch weiß es schon…'],
  done: ['Tadaa! Das hat dein Bauch gesagt 💖', 'Das klingt nach einem Plan! 😋'],
  taken: 'Super Wahl! Guten Appetit 🍽️',
};
