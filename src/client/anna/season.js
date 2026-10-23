/**
 * Jahreszeiten und Anlässe – reine Funktionen ohne DOM (getestet in season.test.mjs).
 * Meteorologische Jahreszeiten der Nordhalbkugel.
 */

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

/** Ostersonntag (Anonymer gregorianischer Algorithmus). */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = März, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getSeason(date) {
  const month = date.getMonth(); // 0 = Januar
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Besonderer Anlass oder `null`.
 * @param {Date} date
 * @param {{month: number, day: number} | null} [birthday] Monat 1–12
 */
export function getSpecial(date, birthday = null) {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (birthday && birthday.month === month && birthday.day === day) return 'birthday';
  if (month === 12 && day === 31 || month === 1 && day === 1) return 'newyear';
  if (month === 12 && day <= 26) return 'christmas';
  if (month === 2 && (day === 13 || day === 14)) return 'valentine';
  if ((month === 10 && day >= 25) || (month === 11 && day === 1)) return 'halloween';

  // Osterwoche: Palmsonntag bis Ostermontag
  const offset = Math.round((startOfDay(date) - startOfDay(easterSunday(date.getFullYear()))) / DAY_MS);
  if (offset >= -7 && offset <= 1) return 'easter';

  return null;
}

/** Schlüssel der Optik: Anlass hat Vorrang vor der Jahreszeit; `override` stammt aus der Fußzeile. */
export function resolveThemeKey(date, override = 'auto', birthday = null) {
  if (override && override !== 'auto') return override;
  return getSpecial(date, birthday) ?? getSeason(date);
}

/** Tageszeit für Begrüßungen. */
export function getDayPart(date) {
  const hour = date.getHours();
  if (hour < 5) return 'night';
  if (hour < 11) return 'morning';
  if (hour < 14) return 'noon';
  if (hour < 18) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
}
