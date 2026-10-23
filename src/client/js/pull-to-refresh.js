/**
 * Pull-to-refresh für Touch-Geräte (die installierte PWA hat keinen nativen).
 * Aktiv, wenn die Seite ganz oben steht und senkrecht nach unten gezogen wird.
 */
import { byId, icon, render } from './dom.js';

const TRIGGER_DISTANCE = 64;
const MAX_PULL = 96;

/** @param {() => Promise<void>} refresh lädt die Daten des aktuellen Tabs neu */
export function initPullToRefresh(refresh) {
  const indicator = byId('ptr-indicator');
  render(indicator, icon('refresh'));

  let startX = 0;
  let startY = 0;
  let pull = 0;
  let tracking = false;
  let busy = false;

  const show = (distance) => {
    indicator.style.transform = `translate(-50%, ${distance - 56}px) rotate(${distance * 4}deg)`;
    indicator.classList.toggle('ready', distance >= TRIGGER_DISTANCE);
    indicator.classList.toggle('visible', distance > 0);
  };

  const hideIndicator = () => {
    indicator.classList.remove('visible', 'ready', 'loading');
    indicator.style.transform = '';
  };

  document.addEventListener('touchstart', (event) => {
    const insideDialog = event.target.closest?.('dialog');
    tracking = !busy && !insideDialog && event.touches.length === 1 && window.scrollY <= 0
      && !byId('app-page').classList.contains('hidden');
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    pull = 0;
  }, { passive: true });

  document.addEventListener('touchmove', (event) => {
    if (!tracking) return;
    const moveX = event.touches[0].clientX - startX;
    const moveY = event.touches[0].clientY - startY;
    if (moveY <= 0 || Math.abs(moveX) > moveY || window.scrollY > 0) {
      if (pull > 0) show((pull = 0));
      return;
    }
    pull = Math.min(moveY * 0.5, MAX_PULL);
    indicator.classList.remove('loading');
    show(pull);
  }, { passive: true });

  const release = async () => {
    if (!tracking) return;
    tracking = false;
    if (pull < TRIGGER_DISTANCE) {
      hideIndicator();
      return;
    }
    busy = true;
    indicator.classList.add('loading');
    indicator.style.transform = 'translate(-50%, 16px)';
    try {
      await refresh();
    } finally {
      busy = false;
      hideIndicator();
    }
  };
  document.addEventListener('touchend', release);
  document.addEventListener('touchcancel', () => {
    tracking = false;
    hideIndicator();
  });
}
