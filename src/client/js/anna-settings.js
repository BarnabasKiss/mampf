/**
 * Einstellungen des optionalen „Anna“-Themes (siehe /anna). Liegt im Kern,
 * weil Fußzeile und Frühstart (theme-init.js) sie lesen, bevor das Theme geladen wird.
 */
import { readJson, writeJson } from './storage.js';

export const ANNA_STORAGE_KEY = 'mampf.anna';

const DEFAULTS = {
  enabled: false,
  season: 'auto', // 'auto' oder ein Schlüssel aus anna/config.js
  motion: 'auto', // 'auto' (folgt der Systemeinstellung), 'on', 'off'
  mascot: true,
};

export function loadAnnaSettings() {
  const stored = readJson(ANNA_STORAGE_KEY, {});
  return { ...DEFAULTS, ...(stored && typeof stored === 'object' ? stored : {}) };
}

export function saveAnnaSettings(partial) {
  const next = { ...loadAnnaSettings(), ...partial };
  writeJson(ANNA_STORAGE_KEY, next);
  return next;
}
