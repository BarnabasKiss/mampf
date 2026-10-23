/**
 * Farbschema: „Auto“ (Systemeinstellung), „Hell“ oder „Dunkel“.
 * Die Wahl wird im localStorage gespeichert; theme-init.js wendet sie früh an.
 */
import { byId, icon, render } from './dom.js';
import { readJson, writeJson } from './storage.js';

const STORAGE_KEY = 'mampf.theme';
const MODES = [
  { id: 'auto', label: 'Automatisch', icon: 'contrast' },
  { id: 'light', label: 'Hell', icon: 'sunny' },
  { id: 'dark', label: 'Dunkel', icon: 'moon' },
];
const BROWSER_COLORS = { light: '#2b8a3e', dark: '#14231a' };

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
let mode = readJson(STORAGE_KEY, 'auto');
if (!MODES.some((m) => m.id === mode)) mode = 'auto';

function apply() {
  const root = document.documentElement;
  if (mode === 'auto') delete root.dataset.theme;
  else root.dataset.theme = mode;

  const effective = mode === 'auto' ? (systemDark.matches ? 'dark' : 'light') : mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_COLORS[effective]);

  const current = MODES.find((m) => m.id === mode);
  const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
  const button = byId('theme-btn');
  render(button, icon(current.icon));
  button.title = `Farbschema: ${current.label} (Klick: ${next.label})`;
  button.setAttribute('aria-label', button.title);
}

export function initTheme() {
  byId('theme-btn').addEventListener('click', () => {
    mode = MODES[(MODES.findIndex((m) => m.id === mode) + 1) % MODES.length].id;
    writeJson(STORAGE_KEY, mode);
    apply();
  });
  systemDark.addEventListener('change', apply);
  apply();
}
