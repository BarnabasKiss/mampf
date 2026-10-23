/**
 * Mampfi – das Maskottchen: eine Schüssel mit Gesicht.
 * Sie blinzelt, folgt dem Zeiger mit den Augen, reagiert mit Stimmungen,
 * trägt je nach Jahreszeit ein Outfit, kann per Ziehen verschoben werden
 * und schläft ein, wenn nichts passiert.
 */
import { readJson, writeJson } from '../js/storage.js';
import { SLEEPY, pick } from './phrases.js';

const POSITION_KEY = 'mampf.anna.mascotPos';
const SLEEP_AFTER_MS = 90_000;
const YAWN_AFTER_MS = 45_000;

// Statisches Markup ohne Nutzerdaten.
const SVG = `
<svg class="m-svg" viewBox="0 0 120 130" aria-hidden="true" focusable="false">
  <g class="m-steam" fill="none" stroke-linecap="round" stroke-width="5">
    <path d="M44 46c-7-8 7-14 0-24"/><path d="M60 42c-7-8 7-14 0-24"/><path d="M76 46c-7-8 7-14 0-24"/>
  </g>
  <g class="m-bunny-ears">
    <g transform="rotate(-14 42 56)"><ellipse cx="42" cy="34" rx="9" ry="23" fill="#fff" stroke="#e8a5bd" stroke-width="2.5"/><ellipse cx="42" cy="36" rx="4" ry="15" fill="#ffc2d4"/></g>
    <g transform="rotate(14 78 56)"><ellipse cx="78" cy="34" rx="9" ry="23" fill="#fff" stroke="#e8a5bd" stroke-width="2.5"/><ellipse cx="78" cy="36" rx="4" ry="15" fill="#ffc2d4"/></g>
  </g>
  <g class="m-body">
    <path class="m-bowl" d="M12 62h96c0 29-22 49-48 49S12 91 12 62z"/>
    <path class="m-band" d="M20 82c26 8 54 8 80 0" fill="none" stroke-width="3" stroke-linecap="round" opacity=".5"/>
    <rect class="m-foot" x="40" y="106" width="40" height="10" rx="5"/>
    <path class="m-rim" d="M12 62h96" stroke-width="8" stroke-linecap="round"/>
    <g class="m-eyes">
      <ellipse cx="44" cy="80" rx="5.5" ry="6.5" fill="#2b2b2b"/><circle cx="45.9" cy="77.6" r="1.9" fill="#fff"/>
      <ellipse cx="76" cy="80" rx="5.5" ry="6.5" fill="#2b2b2b"/><circle cx="77.9" cy="77.6" r="1.9" fill="#fff"/>
    </g>
    <g class="m-lids" fill="none" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round">
      <path d="M37 80q7 6 14 0"/><path d="M69 80q7 6 14 0"/>
    </g>
    <ellipse cx="31" cy="91" rx="7" ry="4.5" fill="#ff9fb5" opacity=".65"/>
    <ellipse cx="89" cy="91" rx="7" ry="4.5" fill="#ff9fb5" opacity=".65"/>
    <path class="m-mouth m-smile" d="M52 92q8 8 16 0" fill="none" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round"/>
    <path class="m-mouth m-happy" d="M50 90q10 15 20 0z" fill="#8a2c3b" stroke="#2b2b2b" stroke-width="2.5" stroke-linejoin="round"/>
    <path class="m-mouth m-sad" d="M52 98q8-8 16 0" fill="none" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round"/>
    <ellipse class="m-mouth m-oh" cx="60" cy="94" rx="5" ry="6" fill="#8a2c3b" stroke="#2b2b2b" stroke-width="2.5"/>
  </g>
  <g class="m-outfit m-flower" transform="translate(26 55)">
    <g fill="#ff8fb1"><circle cy="-8" r="5.5"/><circle cx="7.6" cy="-2.5" r="5.5"/><circle cx="4.7" cy="6.5" r="5.5"/><circle cx="-4.7" cy="6.5" r="5.5"/><circle cx="-7.6" cy="-2.5" r="5.5"/></g>
    <circle r="4.5" fill="#ffd43b"/>
  </g>
  <g class="m-outfit m-shades">
    <rect x="32" y="71" width="25" height="16" rx="7" fill="#232323"/><rect x="63" y="71" width="25" height="16" rx="7" fill="#232323"/>
    <path d="M57 77h6" stroke="#232323" stroke-width="3"/><path d="M36 75l6-1M67 75l6-1" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>
  </g>
  <g class="m-outfit m-leaf" transform="rotate(-18 60 50)">
    <path d="M60 58c-14-6-17-20-6-30 4 4 8 4 6-6 2 10 6 10 6 6 11 10 8 24-6 30z" fill="#e8590c"/><path d="M60 58V36" stroke="#a63d07" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <g class="m-outfit m-beanie">
    <path d="M26 62c0-24 13-36 34-36s34 12 34 36z" fill="#4c6ef5"/>
    <rect x="22" y="56" width="76" height="12" rx="6" fill="#e7f0ff"/>
    <path d="M40 56v-24M52 56v-30M64 56v-30M76 56v-24" stroke="#3b5bdb" stroke-width="2.5" opacity=".5"/>
    <circle cx="60" cy="24" r="8" fill="#fff"/>
  </g>
  <g class="m-outfit m-santa">
    <path d="M26 62C30 28 54 14 82 22c8 2 14 10 10 18-6-3-11-2-15 2 5 8 12 12 18 20z" fill="#e03131"/>
    <rect x="22" y="56" width="76" height="12" rx="6" fill="#fff"/><circle cx="88" cy="22" r="8" fill="#fff"/>
  </g>
  <g class="m-outfit m-witch">
    <ellipse cx="60" cy="58" rx="44" ry="9" fill="#2b1b3d"/>
    <path d="M40 56L58 6l22 50z" fill="#2b1b3d"/><rect x="43" y="42" width="34" height="9" fill="#ff922b"/><rect x="55" y="41" width="10" height="11" rx="2" fill="none" stroke="#ffd43b" stroke-width="2"/>
  </g>
  <g class="m-outfit m-heart"><path class="m-beat" d="M60 38c-18-12-22-26-10-30 6-2 10 2 10 6 0-4 4-8 10-6 12 4 8 18-10 30z" fill="#ff4d6d"/></g>
  <g class="m-outfit m-party">
    <path d="M42 60L60 12l18 48z" fill="#ffd43b"/><path d="M48 46h24M45 54h30" stroke="#ff6b9d" stroke-width="5"/><path d="M52 32h16" stroke="#4dabf7" stroke-width="5"/><circle cx="60" cy="12" r="5.5" fill="#ff6b9d"/>
  </g>
  <g class="m-zzz" font-family="Fredoka, sans-serif" font-weight="700" fill="currentColor"><text x="86" y="40" font-size="16">z</text><text x="96" y="26" font-size="12">z</text><text x="104" y="14" font-size="9">z</text></g>
</svg>`;

/**
 * @param {{ outfit: string, onPoke: () => void }} options
 */
export function createMascot({ outfit, onPoke }) {
  const root = document.createElement('div');
  root.className = 'anna-mascot';
  root.dataset.mood = 'idle';
  root.dataset.outfit = outfit;
  root.tabIndex = 0;
  root.setAttribute('role', 'button');
  root.setAttribute('aria-label', 'Mampfi, dein Küchenhelfer – antippen für einen Spruch');

  const bubble = document.createElement('div');
  bubble.className = 'anna-bubble';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  bubble.hidden = true;
  root.append(bubble);
  root.insertAdjacentHTML('beforeend', SVG);
  document.body.append(root);

  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };
  const cancel = (id) => {
    clearTimeout(id);
    timers.delete(id);
  };

  // ---------- Stimmung & Sprechblase ----------
  let moodTimer = null;
  let bubbleTimer = null;
  let sleeping = false;

  function setMood(mood, ms = 0) {
    cancel(moodTimer);
    root.dataset.mood = mood;
    sleeping = mood === 'sleep';
    if (ms > 0) moodTimer = later(() => setMood('idle'), ms);
  }

  /** `quiet`: nur sprechen, wenn gerade keine andere Sprechblase offen ist. */
  function say(text, { ms = 4500, mood = null, quiet = false } = {}) {
    if (quiet && !bubble.hidden) return;
    if (mood) setMood(mood, ms);
    bubble.textContent = text;
    bubble.hidden = false;
    placeBubble();
    bubble.classList.remove('pop');
    void bubble.offsetWidth; // Animation neu starten
    bubble.classList.add('pop');
    cancel(bubbleTimer);
    bubbleTimer = later(() => {
      bubble.hidden = true;
    }, ms);
  }

  function placeBubble() {
    const rect = root.getBoundingClientRect();
    root.classList.toggle('bubble-left', rect.left + rect.width / 2 < window.innerWidth / 2);
    root.classList.toggle('bubble-below', rect.top < 140);
  }

  function chomp() {
    setMood('happy', 1400);
    root.classList.add('chomp');
    later(() => root.classList.remove('chomp'), 1400);
  }

  // ---------- Blinzeln, Augen, Müdigkeit ----------
  function scheduleBlink() {
    later(() => {
      if (!sleeping) {
        root.classList.add('blink');
        later(() => root.classList.remove('blink'), 160);
      }
      scheduleBlink();
    }, 2500 + Math.random() * 3500);
  }
  scheduleBlink();

  let eyeFrame = 0;
  const lookAt = (event) => {
    if (eyeFrame || sleeping) return;
    eyeFrame = requestAnimationFrame(() => {
      eyeFrame = 0;
      const rect = root.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height * 0.65);
      const length = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, length / 220) * 3.5;
      root.style.setProperty('--ex', `${((dx / length) * reach).toFixed(2)}px`);
      root.style.setProperty('--ey', `${((dy / length) * reach).toFixed(2)}px`);
    });
  };
  window.addEventListener('pointermove', lookAt, { passive: true });

  let yawnTimer = null;
  let sleepTimer = null;
  function resetIdleTimers() {
    cancel(yawnTimer);
    cancel(sleepTimer);
    if (sleeping) setMood('idle');
    yawnTimer = later(() => say(pick(SLEEPY), { ms: 5000, mood: 'oh', quiet: true }), YAWN_AFTER_MS);
    sleepTimer = later(() => setMood('sleep'), SLEEP_AFTER_MS);
  }
  const activity = () => resetIdleTimers();
  ['pointerdown', 'keydown'].forEach((type) => window.addEventListener(type, activity, { passive: true }));
  resetIdleTimers();

  // ---------- Position & Ziehen ----------
  function applyPosition(pos) {
    if (!pos) return;
    const maxLeft = window.innerWidth - root.offsetWidth - 4;
    const maxTop = window.innerHeight - root.offsetHeight - 4;
    root.style.left = `${Math.min(Math.max(4, pos.left), Math.max(4, maxLeft))}px`;
    root.style.top = `${Math.min(Math.max(4, pos.top), Math.max(4, maxTop))}px`;
    root.style.right = 'auto';
    root.style.bottom = 'auto';
    root.classList.add('positioned');
  }
  const saved = readJson(POSITION_KEY, null);
  if (saved) later(() => applyPosition(saved), 0);
  const onResize = () => {
    const pos = readJson(POSITION_KEY, null);
    if (pos) applyPosition(pos);
  };
  window.addEventListener('resize', onResize);

  let drag = null;
  root.addEventListener('pointerdown', (event) => {
    const rect = root.getBoundingClientRect();
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, moved: false };
    root.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 7) return;
    drag.moved = true;
    root.classList.add('dragging');
    applyPosition({ left: drag.left + dx, top: drag.top + dy });
    placeBubble();
  });
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const wasDrag = drag.moved;
    drag = null;
    root.classList.remove('dragging');
    if (wasDrag) {
      const rect = root.getBoundingClientRect();
      writeJson(POSITION_KEY, { left: rect.left, top: rect.top });
      setMood('happy', 900);
    } else {
      onPoke();
    }
  };
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', () => {
    drag = null;
    root.classList.remove('dragging');
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPoke();
    }
  });

  function dispose() {
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    cancelAnimationFrame(eyeFrame);
    window.removeEventListener('pointermove', lookAt);
    window.removeEventListener('resize', onResize);
    ['pointerdown', 'keydown'].forEach((type) => window.removeEventListener(type, activity));
    root.remove();
  }

  return {
    root,
    say,
    setMood,
    chomp,
    setOutfit: (name) => { root.dataset.outfit = name; },
    setVisible: (visible) => { root.hidden = !visible; },
    resetPosition: () => {
      writeJson(POSITION_KEY, null);
      ['left', 'top', 'right', 'bottom'].forEach((side) => root.style.removeProperty(side));
      root.classList.remove('positioned');
    },
    dispose,
  };
}
