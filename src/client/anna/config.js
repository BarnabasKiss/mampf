/**
 * Konfiguration des Anna-Themes: Anlässe, Partikel, Texte.
 * Hier lässt sich alles Persönliche anpassen, ohne Code zu ändern.
 */

/** Geburtstag für die Überraschung: `{ month: 1–12, day: 1–31 }` oder `null`. */
export const BIRTHDAY = null;

/** Liebesbrief, der als Easter Egg in der Fußzeile steckt (5× auf „Mit Liebe gekocht“ tippen). */
export const LOVE_NOTE = 'Du machst jeden Tag ein bisschen leckerer. 💕';

/**
 * Partikel-Arten: `fall` (fällt), `rise` (steigt), `drift` (schwebt seitwärts).
 * Je Eintrag [Emoji, Art].
 */
export const THEMES = {
  spring:    { label: 'Frühling',      icon: '🌸', check: '🌸', empty: '🌷', outfit: 'flower',   particles: [['🌸', 'fall'], ['🌷', 'fall'], ['🌼', 'fall'], ['🦋', 'drift']] },
  summer:    { label: 'Sommer',        icon: '☀️', check: '🌻', empty: '🍓', outfit: 'shades',   particles: [['🐝', 'drift'], ['🦋', 'drift'], ['🫧', 'rise'], ['🌻', 'rise'], ['✨', 'rise']] },
  autumn:    { label: 'Herbst',        icon: '🍂', check: '🍂', empty: '🍄', outfit: 'leaf',     particles: [['🍂', 'fall'], ['🍁', 'fall'], ['🍃', 'fall'], ['🌰', 'fall']] },
  winter:    { label: 'Winter',        icon: '❄️', check: '❄️', empty: '☃️', outfit: 'beanie',   particles: [['❄️', 'fall'], ['❄', 'fall'], ['✨', 'fall']] },
  valentine: { label: 'Valentinstag',  icon: '💕', check: '💖', empty: '💌', outfit: 'heart',    particles: [['💕', 'rise'], ['💗', 'rise'], ['🌹', 'fall'], ['💖', 'rise']] },
  easter:    { label: 'Ostern',        icon: '🐰', check: '🥚', empty: '🐰', outfit: 'bunny',    particles: [['🥚', 'fall'], ['🌷', 'fall'], ['🐣', 'drift'], ['🌼', 'fall']] },
  halloween: { label: 'Halloween',     icon: '🎃', check: '🎃', empty: '👻', outfit: 'witch',    particles: [['🎃', 'fall'], ['👻', 'rise'], ['🦇', 'drift'], ['🍬', 'fall']] },
  christmas: { label: 'Weihnachten',   icon: '🎄', check: '🎄', empty: '🎅', outfit: 'santa',    particles: [['❄️', 'fall'], ['⭐', 'fall'], ['🎁', 'fall'], ['✨', 'fall']] },
  newyear:   { label: 'Silvester',     icon: '🥂', check: '🥂', empty: '🎆', outfit: 'party',    particles: [['🎆', 'rise'], ['🎉', 'fall'], ['✨', 'rise'], ['🥂', 'rise']] },
  birthday:  { label: 'Geburtstag',    icon: '🎂', check: '🎈', empty: '🎂', outfit: 'party',    particles: [['🎈', 'rise'], ['🎉', 'fall'], ['🎁', 'fall'], ['💖', 'rise']] },
};

/** Reihenfolge im Auswahlfeld der Fußzeile. */
export const THEME_ORDER = ['spring', 'summer', 'autumn', 'winter', 'valentine', 'easter', 'halloween', 'christmas', 'newyear', 'birthday'];

/** Essens-Emojis für den „Heißhunger-Modus“. */
export const FOOD_EMOJIS = ['🍕', '🍩', '🍔', '🍟', '🌮', '🍣', '🍦', '🍰', '🍓', '🥐', '🍪', '🧁', '🍫', '🥞'];
