/**
 * Visuelle Effekte: fallende/steigende Partikel, Konfetti, Feuerwerk, Regen, Funkenspur.
 * Alles liegt in zwei Ebenen (`.anna-particles`, `.anna-fx`), die `pointer-events: none` haben,
 * damit die App jederzeit bedienbar bleibt.
 */
import { THEMES } from './config.js';

const rand = (min, max) => min + Math.random() * (max - min);
const choice = (list) => list[Math.floor(Math.random() * list.length)];
const DOT_HUES = [340, 20, 45, 150, 200, 270];

/** @returns {ReturnType<typeof buildEffects>} */
export function createEffects() {
  return buildEffects();
}

function buildEffects() {
  const particles = document.createElement('div');
  particles.className = 'anna-particles';
  particles.setAttribute('aria-hidden', 'true');
  const fx = document.createElement('div');
  fx.className = 'anna-fx';
  fx.setAttribute('aria-hidden', 'true');
  document.body.append(particles, fx);

  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  const every = (fn, ms) => {
    const id = setInterval(fn, ms);
    timers.add(id);
    return () => {
      clearInterval(id);
      timers.delete(id);
    };
  };

  let motion = true;
  let stopFireworks = null;

  function particleCount() {
    return window.innerWidth < 600 ? 12 : 18;
  }

  /** Baut das Partikelfeld für ein Thema neu auf. */
  function setTheme(key, enabled) {
    motion = enabled;
    particles.replaceChildren();
    stopFireworks?.();
    stopFireworks = null;
    if (!enabled) return;

    const theme = THEMES[key];
    for (let i = 0; i < particleCount(); i++) {
      const [emoji, kind] = choice(theme.particles);
      particles.append(makeParticle(emoji, kind));
    }
    if (key === 'newyear') stopFireworks = every(() => fireworks(1), 3500);
  }

  function makeParticle(emoji, kind) {
    const outer = document.createElement('span');
    const inner = document.createElement('i');
    inner.textContent = emoji;
    outer.append(inner);
    outer.className = `anna-particle anna-${kind}`;
    const duration = kind === 'drift' ? rand(14, 26) : rand(9, 20);
    outer.style.cssText = [
      `--x:${rand(0, 100).toFixed(1)}%`,
      `--y:${rand(8, 85).toFixed(1)}%`,
      `--size:${rand(15, 26).toFixed(0)}px`,
      `--dur:${duration.toFixed(1)}s`,
      `--delay:-${rand(0, duration).toFixed(1)}s`,
      `--drift:${rand(-80, 80).toFixed(0)}px`,
      `--spin:${rand(-360, 360).toFixed(0)}deg`,
      `--sway:${rand(14, 40).toFixed(0)}px`,
      `--sway-dur:${rand(2.5, 5).toFixed(1)}s`,
    ].join(';');
    return outer;
  }

  function spawn(className, text, styles, lifetimeMs) {
    const node = document.createElement('span');
    node.className = className;
    node.textContent = text;
    node.style.cssText = styles;
    fx.append(node);
    later(() => node.remove(), lifetimeMs);
    return node;
  }

  /** Konfetti-Explosion an einer Position (Viewport-Koordinaten). */
  function burst(x, y, { emojis = ['✨', '💖'], count = 12, dots = 0, spread = 110 } = {}) {
    if (!motion) return;
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const distance = rand(spread * 0.4, spread);
      spawn('anna-burst', choice(emojis), [
        `left:${x}px`, `top:${y}px`,
        `--dx:${(Math.cos(angle) * distance).toFixed(0)}px`,
        `--dy:${(Math.sin(angle) * distance - 30).toFixed(0)}px`,
        `--rot:${rand(-200, 200).toFixed(0)}deg`,
        `--size:${rand(14, 24).toFixed(0)}px`,
      ].join(';'), 1100);
    }
    for (let i = 0; i < dots; i++) {
      const angle = (i / dots) * Math.PI * 2 + rand(-0.15, 0.15);
      const distance = rand(spread * 0.6, spread * 1.2);
      spawn('anna-spark', '', [
        `left:${x}px`, `top:${y}px`,
        `--dx:${(Math.cos(angle) * distance).toFixed(0)}px`,
        `--dy:${(Math.sin(angle) * distance).toFixed(0)}px`,
        `--hue:${choice(DOT_HUES)}`,
      ].join(';'), 1100);
    }
  }

  function burstAtElement(element, options) {
    const rect = element.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, options);
  }

  /** `count` Feuerwerke an zufälligen Stellen im oberen Bildschirmdrittel. */
  function fireworks(count = 4) {
    if (!motion) return;
    for (let i = 0; i < count; i++) {
      later(() => burst(rand(0.15, 0.85) * window.innerWidth, rand(0.12, 0.45) * window.innerHeight, { emojis: ['✨'], count: 4, dots: 22, spread: 130 }), i * 450);
    }
  }

  /** Regen aus Emojis für `ms` Millisekunden. */
  function rain(emojis, ms = 6000, density = 110) {
    if (!motion) return;
    const stop = every(() => {
      spawn('anna-rain', choice(emojis), [
        `left:${rand(0, 100).toFixed(1)}%`,
        `--size:${rand(20, 38).toFixed(0)}px`,
        `--dur:${rand(2.4, 4.2).toFixed(1)}s`,
        `--drift:${rand(-60, 60).toFixed(0)}px`,
        `--spin:${rand(-300, 300).toFixed(0)}deg`,
      ].join(';'), 4500);
    }, density);
    later(stop, ms);
  }

  /** Kleines Funkeln (Mausspur, Tipp auf den Hintergrund). */
  function sparkle(x, y, emoji = '✨') {
    if (!motion) return;
    spawn('anna-trail', emoji, `left:${x}px;top:${y}px;--dx:${rand(-14, 14).toFixed(0)}px;--size:${rand(10, 16).toFixed(0)}px`, 800);
  }

  function setPaused(paused) {
    document.documentElement.classList.toggle('anna-paused', paused);
  }

  function dispose() {
    timers.forEach((id) => {
      clearTimeout(id);
      clearInterval(id);
    });
    timers.clear();
    particles.remove();
    fx.remove();
    document.documentElement.classList.remove('anna-paused');
  }

  return { setTheme, burst, burstAtElement, fireworks, rain, sparkle, setPaused, dispose, get motion() { return motion; } };
}
