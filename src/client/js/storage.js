/** Fehlertoleranter localStorage-Zugriff (kann in privaten Fenstern o. Ä. fehlen). */

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nicht kritisch: der Zustand bleibt im Speicher, geht aber beim Neustart verloren.
  }
}
