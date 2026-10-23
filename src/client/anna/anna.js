/**
 * Anna-Theme – Einstiegspunkt.
 *
 * Ein vollständig getrenntes, optionales Theme: eigenes CSS (anna.css), Partikel,
 * Maskottchen, Easter Eggs. `enableAnna()` baut alles auf, `disableAnna()` entfernt es
 * wieder rückstandslos (Stylesheet, DOM, Listener, Timer, ersetzte Texte).
 */
import { loadAnnaSettings, saveAnnaSettings } from '../js/anna-settings.js';
import { BIRTHDAY, THEMES, THEME_ORDER } from './config.js';
import { createEffects } from './effects.js';
import { installEggs } from './eggs.js';
import { createMascot } from './mascot.js';
import { GREETINGS, SEASON_TIPS, SPECIAL_GREETINGS, pick } from './phrases.js';
import { getDayPart, resolveThemeKey } from './season.js';
import { createSlot } from './slot.js';

const STYLESHEET_ID = 'anna-css';
const LAST_GREETING_KEY = 'mampf.anna.lastGreeting';
const GREETING_COOLDOWN_MS = 20 * 60 * 1000;

let session = null;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function motionEnabled(settings) {
  return settings.motion === 'on' || (settings.motion === 'auto' && !prefersReducedMotion());
}

/** Stellt sicher, dass anna.css geladen ist (theme-init.js hat es evtl. schon eingefügt). */
function ensureStylesheet() {
  let link = document.getElementById(STYLESHEET_ID);
  if (!link) {
    link = document.createElement('link');
    link.id = STYLESHEET_ID;
    link.rel = 'stylesheet';
    link.href = '/anna/anna.css';
    document.head.append(link);
  }
  if (link.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true }); // ohne CSS weiterlaufen statt hängen
  });
}

function lastGreetingAt() {
  try {
    return Number(localStorage.getItem(LAST_GREETING_KEY)) || 0;
  } catch {
    return 0;
  }
}

function markGreeted() {
  try {
    localStorage.setItem(LAST_GREETING_KEY, String(Date.now()));
  } catch {
    // nicht kritisch
  }
}

/**
 * @param {{controls: HTMLElement, announce: boolean}} options
 *   `announce`: Theme wurde gerade aktiv eingeschaltet (statt beim Seitenstart wiederhergestellt).
 */
export async function enableAnna({ controls, announce }) {
  if (session) return;
  await ensureStylesheet();
  if (session) return; // zwischenzeitlich doppelt aufgerufen

  const cleanups = [];
  const root = document.documentElement;
  let settings = loadAnnaSettings();
  let key = resolveThemeKey(new Date(), settings.season, BIRTHDAY);

  root.dataset.anna = '';

  const effects = createEffects();
  cleanups.push(() => effects.dispose());

  let eggs = null;
  const mascot = createMascot({ outfit: THEMES[key].outfit, onPoke: () => eggs.poke() });
  cleanups.push(() => mascot.dispose());
  mascot.setVisible(settings.mascot);

  eggs = installEggs({ effects, mascot, getKey: () => key });
  cleanups.push(() => eggs.dispose());

  const slot = createSlot({ effects, mascot });
  cleanups.push(() => slot.dispose());

  // ---------- Texte, die das Theme ersetzt (werden beim Ausschalten zurückgesetzt) ----------
  const originals = new Map();
  function swapText(selector, text) {
    const element = document.querySelector(selector);
    if (!element) return;
    if (!originals.has(element)) originals.set(element, element.textContent);
    element.textContent = text;
  }
  cleanups.push(() => originals.forEach((text, element) => { element.textContent = text; }));

  // ---------- Thema anwenden ----------
  function applyKey() {
    const theme = THEMES[key];
    root.dataset.annaKey = key;
    root.dataset.annaMotion = motionEnabled(settings) ? 'on' : 'off';
    root.style.setProperty('--anna-check', `"${theme.check}"`);
    root.style.setProperty('--anna-empty', `"${theme.empty}"`);
    effects.setTheme(key, motionEnabled(settings));
    mascot.setOutfit(theme.outfit);
    swapText('.login-card .subtitle', `Schön, dass du da bist, Anna ${theme.icon}`);
    swapText('.footer-note', `Mampf · mit extra viel Liebe gekocht ${theme.icon}`);
    refreshControls();
  }
  cleanups.push(() => {
    ['annaKey', 'annaMotion', 'anna'].forEach((name) => delete root.dataset[name]);
    root.style.removeProperty('--anna-check');
    root.style.removeProperty('--anna-empty');
  });

  // ---------- Bedienelemente in der Fußzeile ----------
  const panel = document.createElement('div');
  panel.className = 'anna-controls';
  const seasonSelect = document.createElement('select');
  seasonSelect.setAttribute('aria-label', 'Jahreszeit oder Anlass');
  const motionBox = document.createElement('input');
  motionBox.type = 'checkbox';
  const mascotBox = document.createElement('input');
  mascotBox.type = 'checkbox';
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'anna-reset';
  resetButton.textContent = 'Mampfi zurückholen';

  const labelled = (text, input) => {
    const label = document.createElement('label');
    label.append(input, ` ${text}`);
    return label;
  };
  const seasonLabel = document.createElement('label');
  seasonLabel.append('Jahreszeit ', seasonSelect);
  panel.append(seasonLabel, labelled('Animationen', motionBox), labelled('Mampfi', mascotBox), resetButton);
  controls.append(panel);
  cleanups.push(() => panel.remove());

  function refreshControls() {
    const autoKey = resolveThemeKey(new Date(), 'auto', BIRTHDAY);
    seasonSelect.replaceChildren(new Option(`Automatisch (${THEMES[autoKey].label} ${THEMES[autoKey].icon})`, 'auto'),
      ...THEME_ORDER.map((id) => new Option(`${THEMES[id].icon} ${THEMES[id].label}`, id)));
    seasonSelect.value = settings.season;
    motionBox.checked = motionEnabled(settings);
    mascotBox.checked = settings.mascot;
  }

  seasonSelect.addEventListener('change', () => {
    settings = saveAnnaSettings({ season: seasonSelect.value });
    key = resolveThemeKey(new Date(), settings.season, BIRTHDAY);
    applyKey();
    mascot.say(pick(THEMES[key].particles)[0] + ` ${THEMES[key].label}! Schau mal, wie schön!`, { ms: 3500, mood: 'happy' });
  });
  motionBox.addEventListener('change', () => {
    settings = saveAnnaSettings({ motion: motionBox.checked ? 'on' : 'off' });
    applyKey();
  });
  mascotBox.addEventListener('change', () => {
    settings = saveAnnaSettings({ mascot: mascotBox.checked });
    mascot.setVisible(settings.mascot);
  });
  resetButton.addEventListener('click', () => {
    mascot.resetPosition();
    saveAnnaSettings({ mascot: true });
    settings = loadAnnaSettings();
    mascot.setVisible(true);
    mascotBox.checked = true;
    mascot.say('Hier bin ich wieder! 👋', { mood: 'happy' });
  });

  // ---------- Sichtbarkeit & Datumswechsel ----------
  const onVisibility = () => {
    effects.setPaused(document.hidden);
    if (!document.hidden && settings.season === 'auto') {
      const next = resolveThemeKey(new Date(), 'auto', BIRTHDAY);
      if (next !== key) {
        key = next;
        applyKey();
      }
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

  const onMotionPreference = () => {
    if (settings.motion === 'auto') applyKey();
  };
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener('change', onMotionPreference);
  cleanups.push(() => motionQuery.removeEventListener('change', onMotionPreference));

  applyKey();

  // ---------- Begrüßung ----------
  const greetTimer = setTimeout(() => {
    const now = new Date();
    if (announce) {
      mascot.say(`Anna-Modus an! ${THEMES[key].icon} Hallo, Anna!`, { ms: 4200, mood: 'happy' });
      effects.burst(window.innerWidth / 2, window.innerHeight / 3, { emojis: [THEMES[key].icon, '✨', '💖'], count: 16, dots: 10, spread: 150 });
    } else if (Date.now() - lastGreetingAt() > GREETING_COOLDOWN_MS) {
      // Anlässe haben eigene Begrüßungen; sonst abwechselnd Tageszeit und Jahreszeit (passend zum gewählten Look).
      const text = SPECIAL_GREETINGS[key] && Math.random() < 0.7
        ? pick(SPECIAL_GREETINGS[key])
        : SEASON_TIPS[key] && Math.random() < 0.5 ? pick(SEASON_TIPS[key]) : pick(GREETINGS[getDayPart(now)]);
      mascot.say(text, { ms: 5200, mood: 'happy' });
    }
    markGreeted();
  }, 1200);
  cleanups.push(() => clearTimeout(greetTimer));

  // Stylesheet zuletzt entfernen, damit beim Abbau nichts „aufblitzt“.
  cleanups.push(() => document.getElementById(STYLESHEET_ID)?.remove());

  session = { cleanups };
}

export function disableAnna() {
  if (!session) {
    document.getElementById(STYLESHEET_ID)?.remove();
    delete document.documentElement.dataset.anna;
    return;
  }
  session.cleanups.reverse().forEach((cleanup) => cleanup());
  session = null;
}
