import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppText, calculatePackages, groupShoppingItems, ingredientsPreview, planToShoppingItems,
  sameList, sortShoppingItems,
} from './domain.js';

const pasta = {
  name: 'Pasta',
  standard_portions: 2,
  ingredients: [
    { name: 'Nudeln', package_count: 1 },
    { name: 'Sauce', package_count: 0.5 },
  ],
};

test('calculatePackages rundet auf und skaliert nach Portionen', () => {
  assert.equal(calculatePackages(1, 2, 2), 1);
  assert.equal(calculatePackages(1, 2, 3), 2);
  assert.equal(calculatePackages(0.5, 2, 2), 1);
  assert.equal(calculatePackages(0.1 * 3, 1, 1), 1); // Gleitkomma-Toleranz
});

test('ingredientsPreview', () => {
  assert.equal(ingredientsPreview([]), '–');
  assert.equal(ingredientsPreview(pasta.ingredients), 'Nudeln, Sauce');
});

test('buildWhatsAppText im WhatsApp-Format', () => {
  const text = buildWhatsAppText([{ meal: pasta, portions: 4 }]);
  assert.equal(text, '*Pasta*\n*4 Portionen*\n- 2 Stk. Nudeln\n- 1 Stk. Sauce');
});

test('planToShoppingItems skaliert Mengen', () => {
  assert.deepEqual(planToShoppingItems([{ meal: pasta, portions: 2 }]), [
    { name: 'Nudeln', amount: '1' },
    { name: 'Sauce', amount: '1' },
  ]);
});

test('groupShoppingItems zeigt „Allgemein“ immer zuerst', () => {
  const groups = groupShoppingItems(
    [{ id: 1, category_id: null }, { id: 2, category_id: 7 }],
    [{ id: 7, name: 'Obst' }]
  );
  assert.equal(groups[0].category, null);
  assert.deepEqual(groups[0].items.map((i) => i.id), [1]);
  assert.deepEqual(groups[1].items.map((i) => i.id), [2]);
});

test('sortShoppingItems: Abgehakte nach unten', () => {
  const sorted = sortShoppingItems([{ id: 1, checked: 1 }, { id: 3, checked: 0 }, { id: 2, checked: 0 }]);
  assert.deepEqual(sorted.map((i) => i.id), [2, 3, 1]);
});

test('sameList vergleicht nur die angegebenen Felder', () => {
  assert.ok(sameList([{ id: 1, x: 1 }], [{ id: 1, x: 2 }], ['id']));
  assert.ok(!sameList([{ id: 1 }], [{ id: 2 }], ['id']));
  assert.ok(!sameList([{ id: 1 }], [], ['id']));
});
