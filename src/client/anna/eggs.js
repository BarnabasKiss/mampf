/**
 * Easter Eggs und kleine Reaktionen auf das, was Anna in der App tut.
 * Alle Listener hängen am `document` und werden in `dispose` wieder entfernt.
 */
import { FOOD_EMOJIS, LOVE_NOTE, THEMES } from './config.js';
import {
  ALL_DONE, ANNA_TYPED, AFTER_PLAN, CHECKED, HUNGER, KEYWORDS, MAMPF_TYPED, PARTY, POKES, REMOVED, SHAKE,
  TAB_TIPS, pick,
} from './phrases.js';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

/**
 * @param {{effects: object, mascot: object, getKey: () => string}} deps
 * @returns {{poke: () => void, dispose: () => void}}
 */
export function installEggs({ effects, mascot, getKey }) {
  const listeners = [];
  const on = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  };
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  const theme = () => THEMES[getKey()];
  const confettiEmojis = () => [...theme().particles.map(([emoji]) => emoji), '✨', '💖'];
  const isTyping = (target) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

  // ---------- Party (7× auf Mampfi tippen) ----------
  let pokeTimes = [];
  function poke() {
    const now = Date.now();
    pokeTimes = [...pokeTimes.filter((t) => now - t < 4000), now];
    if (pokeTimes.length >= 7) {
      pokeTimes = [];
      party();
      return;
    }
    mascot.say(pick(POKES), { ms: 3200, mood: 'happy' });
    const rect = mascot.root.getBoundingClientRect();
    effects.burst(rect.left + rect.width / 2, rect.top + 20, { emojis: ['💖', '✨'], count: 5, spread: 60 });
  }

  function party() {
    mascot.say(pick(PARTY), { ms: 5200, mood: 'happy' });
    mascot.root.classList.add('dance');
    document.documentElement.classList.add('anna-party');
    effects.rain(confettiEmojis(), 5200, 70);
    effects.fireworks(4);
    later(() => {
      mascot.root.classList.remove('dance');
      document.documentElement.classList.remove('anna-party');
    }, 5400);
  }

  // ---------- Heißhunger-Modus (Konami-Code oder 3× auf den Sync-Punkt) ----------
  function hunger() {
    mascot.say(pick(HUNGER), { ms: 6000, mood: 'happy' });
    mascot.chomp();
    effects.rain(FOOD_EMOJIS, 9000, 55);
  }

  let konamiIndex = 0;
  let typed = '';
  on(document, 'keydown', (event) => {
    if (isTyping(event.target)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    konamiIndex = key === KONAMI[konamiIndex] ? konamiIndex + 1 : key === KONAMI[0] ? 1 : 0;
    if (konamiIndex === KONAMI.length) {
      konamiIndex = 0;
      hunger();
    }

    if (event.key.length === 1) {
      typed = (typed + key).slice(-5);
      if (typed.endsWith('anna')) {
        mascot.say(pick(ANNA_TYPED), { ms: 5000, mood: 'happy' });
        effects.rain(['💖', '💕', '🌸', '✨'], 4200, 80);
      } else if (typed.endsWith('mampf')) {
        mascot.say(pick(MAMPF_TYPED), { ms: 3500 });
        mascot.chomp();
      }
    }
  });

  let syncTaps = [];
  on(document, 'click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('#sync-indicator')) {
      const now = Date.now();
      syncTaps = [...syncTaps.filter((t) => now - t < 1500), now];
      if (syncTaps.length >= 3) {
        syncTaps = [];
        hunger();
      }
    }
    if (target.closest('.brand')) logoTap();
    if (target.closest('.footer-note')) noteTap();

    // Kleine Funken beim Tippen auf freie Flächen
    if (!target.closest('button, input, select, textarea, a, dialog, .anna-mascot')) {
      effects.sparkle(event.clientX, event.clientY, pick(['✨', '💖', theme().icon]));
    }

    reactToClick(target);
  }, true);

  // ---------- Logo (5×) und Fußzeile (5×) ----------
  let logoTaps = [];
  function logoTap() {
    const now = Date.now();
    logoTaps = [...logoTaps.filter((t) => now - t < 3000), now];
    if (logoTaps.length >= 5) {
      logoTaps = [];
      mascot.say('Mampf mampf – die Schüssel läuft über! 🥣', { ms: 4000, mood: 'happy' });
      effects.rain(['🥣', '🍲', '💖', '✨'], 3500, 60);
    }
  }

  let noteTaps = [];
  function noteTap() {
    const now = Date.now();
    noteTaps = [...noteTaps.filter((t) => now - t < 3000), now];
    if (noteTaps.length >= 5) {
      noteTaps = [];
      mascot.say(LOVE_NOTE, { ms: 7000, mood: 'happy' });
      effects.rain(['💖', '💕', '💗', '💌'], 5000, 60);
    }
  }

  // ---------- Reaktionen auf Aktionen ----------
  let lastKeywordAt = 0;
  on(document, 'change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.classList.contains('shopping-checkbox')) {
      if (target.checked) {
        effects.burstAtElement(target, { emojis: [theme().check, '✨'], count: 7, dots: 6, spread: 70 });
        mascot.setMood('happy', 900);
        if (Math.random() < 0.35) mascot.say(pick(CHECKED), { ms: 2200, quiet: true });
        later(checkAllDone, 450);
      }
      return;
    }

    const isNameField = target.matches('.shopping-name-input, #meal-name, .ingredient-name, .template-item-name');
    if (isNameField && Date.now() - lastKeywordAt > 6000) {
      const value = target.value.toLowerCase();
      const hit = KEYWORDS.find(([pattern]) => pattern.test(value));
      if (hit) {
        lastKeywordAt = Date.now();
        mascot.say(hit[1], { ms: 4200, mood: 'happy' });
      }
    }
  }, true);

  function checkAllDone() {
    const rows = document.querySelectorAll('.shopping-item');
    if (rows.length > 0 && !document.querySelector('.shopping-item:not(.checked)')) {
      mascot.say(pick(ALL_DONE), { ms: 5000, mood: 'happy' });
      effects.fireworks(3);
      effects.rain(confettiEmojis(), 2600, 60);
    }
  }

  let lastTabTipAt = 0;
  function reactToClick(target) {
    if (target.closest('.shopping-item .btn-icon-delete')) {
      mascot.say(pick(REMOVED), { ms: 2200, mood: 'sad', quiet: true });
    } else if (target.closest('.toast-action')) {
      mascot.say('Und schon ist sie wieder da! 🎉', { ms: 2500, mood: 'happy' });
    } else if (target.closest('#generate-plan-btn, #random-add-plan-btn')) {
      later(() => mascot.say(pick(AFTER_PLAN), { ms: 3500, mood: 'happy', quiet: true }), 800);
    } else if (target.closest('#add-to-shopping-btn')) {
      later(() => mascot.say('Ab auf die Liste! 🛒', { ms: 3000, mood: 'happy', quiet: true }), 500);
    } else if (target.closest('#copy-whatsapp-btn')) {
      later(() => mascot.say('Kopiert – schick es ab! 💌', { ms: 3000, mood: 'happy', quiet: true }), 400);
    } else {
      const tab = target.closest('.tab-btn')?.dataset.tab;
      if (tab && Date.now() - lastTabTipAt > 20_000 && Math.random() < 0.3) {
        lastTabTipAt = Date.now();
        mascot.say(pick(TAB_TIPS[tab]), { ms: 3500, quiet: true });
      }
    }
  }

  // ---------- Schütteln (nur Geräte ohne Berechtigungsabfrage, z. B. Android) ----------
  if ('DeviceMotionEvent' in window && typeof DeviceMotionEvent.requestPermission !== 'function') {
    let shakes = [];
    on(window, 'devicemotion', (event) => {
      const a = event.accelerationIncludingGravity;
      if (!a || Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) < 28) return;
      const now = Date.now();
      shakes = [...shakes.filter((t) => now - t < 1000), now];
      if (shakes.length >= 3) {
        shakes = [];
        mascot.say(pick(SHAKE), { ms: 3500, mood: 'oh' });
        mascot.root.classList.add('dizzy');
        later(() => mascot.root.classList.remove('dizzy'), 1600);
      }
    });
  }

  // ---------- Funkenspur der Maus (nur Desktop) ----------
  let lastTrail = 0;
  on(window, 'pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - lastTrail < 90) return;
    lastTrail = now;
    effects.sparkle(event.clientX, event.clientY, theme().particles[0][0]);
  }, { passive: true });

  function dispose() {
    listeners.forEach((off) => off());
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    document.documentElement.classList.remove('anna-party');
  }

  return { poke, dispose };
}
