import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easterSunday, getDayPart, getSeason, getSpecial, resolveThemeKey } from './season.js';

const d = (y, m, day, h = 12) => new Date(y, m - 1, day, h);

test('easterSunday kennt bekannte Termine', () => {
  const fmt = (date) => `${date.getMonth() + 1}-${date.getDate()}`;
  assert.equal(fmt(easterSunday(2024)), '3-31');
  assert.equal(fmt(easterSunday(2025)), '4-20');
  assert.equal(fmt(easterSunday(2026)), '4-5');
  assert.equal(fmt(easterSunday(2027)), '3-28');
});

test('getSeason: meteorologische Jahreszeiten', () => {
  assert.equal(getSeason(d(2026, 3, 1)), 'spring');
  assert.equal(getSeason(d(2026, 5, 31)), 'spring');
  assert.equal(getSeason(d(2026, 6, 1)), 'summer');
  assert.equal(getSeason(d(2026, 9, 1)), 'autumn');
  assert.equal(getSeason(d(2026, 11, 30)), 'autumn');
  assert.equal(getSeason(d(2026, 12, 1)), 'winter');
  assert.equal(getSeason(d(2026, 2, 28)), 'winter');
});

test('getSpecial: Anlässe', () => {
  assert.equal(getSpecial(d(2026, 10, 24)), null);
  assert.equal(getSpecial(d(2026, 10, 25)), 'halloween');
  assert.equal(getSpecial(d(2026, 11, 1)), 'halloween');
  assert.equal(getSpecial(d(2026, 11, 2)), null);
  assert.equal(getSpecial(d(2026, 12, 1)), 'christmas');
  assert.equal(getSpecial(d(2026, 12, 26)), 'christmas');
  assert.equal(getSpecial(d(2026, 12, 27)), null);
  assert.equal(getSpecial(d(2026, 12, 31)), 'newyear');
  assert.equal(getSpecial(d(2027, 1, 1)), 'newyear');
  assert.equal(getSpecial(d(2026, 2, 14)), 'valentine');
  assert.equal(getSpecial(d(2026, 3, 29)), 'easter'); // Palmsonntag 2026
  assert.equal(getSpecial(d(2026, 4, 6)), 'easter'); // Ostermontag
  assert.equal(getSpecial(d(2026, 4, 7)), null);
});

test('getSpecial: Geburtstag hat Vorrang', () => {
  assert.equal(getSpecial(d(2026, 12, 24), { month: 12, day: 24 }), 'birthday');
  assert.equal(getSpecial(d(2026, 12, 24), null), 'christmas');
});

test('resolveThemeKey: Override schlägt Datum, Anlass schlägt Jahreszeit', () => {
  assert.equal(resolveThemeKey(d(2026, 10, 23)), 'autumn');
  assert.equal(resolveThemeKey(d(2026, 10, 30)), 'halloween');
  assert.equal(resolveThemeKey(d(2026, 10, 30), 'spring'), 'spring');
  assert.equal(resolveThemeKey(d(2026, 10, 30), 'auto'), 'halloween');
});

test('getDayPart', () => {
  assert.equal(getDayPart(d(2026, 1, 1, 3)), 'night');
  assert.equal(getDayPart(d(2026, 1, 1, 8)), 'morning');
  assert.equal(getDayPart(d(2026, 1, 1, 12)), 'noon');
  assert.equal(getDayPart(d(2026, 1, 1, 16)), 'afternoon');
  assert.equal(getDayPart(d(2026, 1, 1, 20)), 'evening');
  assert.equal(getDayPart(d(2026, 1, 1, 23)), 'night');
});
