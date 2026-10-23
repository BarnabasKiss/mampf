import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMealInput } from './meal.validation';
import { validateBulkItems, validateItemList, validateName, validateTemplateInput } from './shopping.validation';
import { normalizeAmount, toCategoryId } from './common';

const validMeal = {
  name: '  Spaghetti ',
  difficulty: '2',
  standard_portions: 4,
  ingredients: [{ name: ' Nudeln ', package_count: '1.5' }, { name: 'Soße', package_count: 1 }],
};

test('validateMealInput: gültige Eingabe wird normalisiert', () => {
  const result = validateMealInput(validMeal);
  assert.ok(result.ok);
  assert.equal(result.value.name, 'Spaghetti');
  assert.equal(result.value.difficulty, 2);
  assert.deepEqual(result.value.ingredients, [
    { name: 'Nudeln', package_count: 1.5, sort_order: 0 },
    { name: 'Soße', package_count: 1, sort_order: 1 },
  ]);
});

test('validateMealInput: sammelt alle Fehler', () => {
  const result = validateMealInput({
    name: '',
    difficulty: 7,
    standard_portions: 0,
    ingredients: [{ name: '', package_count: 0 }],
  });
  assert.ok(!result.ok);
  assert.deepEqual(result.errors, [
    'Name ist erforderlich.',
    'Schwierigkeit muss 1, 2 oder 3 sein.',
    'Standardportionen müssen mindestens 1 sein.',
    'Zutat 1: Name ist erforderlich.',
    'Zutat 1: Packungsanzahl muss größer als 0 sein.',
  ]);
});

test('validateMealInput: ohne Zutaten und mit Nicht-Objekt', () => {
  const noIngredients = validateMealInput({ ...validMeal, ingredients: [] });
  assert.ok(!noIngredients.ok);
  assert.deepEqual(noIngredients.errors, ['Mindestens eine Zutat ist erforderlich.']);
  assert.ok(!validateMealInput(null).ok);
});

test('normalizeAmount / toCategoryId', () => {
  assert.equal(normalizeAmount(undefined), '1');
  assert.equal(normalizeAmount('  '), '1');
  assert.equal(normalizeAmount(' 2 kg '), '2 kg');
  assert.equal(normalizeAmount(3), '3');
  assert.equal(toCategoryId('5'), 5);
  assert.equal(toCategoryId(null), null);
  assert.equal(toCategoryId('abc'), null);
  assert.equal(toCategoryId(-1), null);
});

test('validateTemplateInput', () => {
  const ok = validateTemplateInput({ name: ' Basics ', items: [{ name: 'Milch' }, { name: ' ' }, { name: 'Brot', amount: 2 }] });
  assert.ok(ok.ok);
  assert.equal(ok.value.name, 'Basics');
  assert.deepEqual(ok.value.items, [
    { name: 'Milch', amount: '1', sort_order: 0 },
    { name: 'Brot', amount: '2', sort_order: 1 },
  ]);

  const noName = validateTemplateInput({ name: '', items: [{ name: 'a' }] });
  assert.ok(!noName.ok);
  assert.deepEqual(noName.errors, ['Name ist erforderlich.']);

  assert.ok(!validateTemplateInput({ name: 'x', items: [] }).ok);
  assert.ok(!validateTemplateInput({ name: 'x', items: [{ name: ' ' }] }).ok);
});

test('Shopping-Item-Validatoren', () => {
  assert.deepEqual(validateItemList('nope'), []);
  assert.deepEqual(validateBulkItems([{ name: 'A', amount: '2', category_id: '3' }, { name: '' }, null]), [
    { name: 'A', amount: '2', category_id: 3 },
  ]);
  assert.equal(validateName({ name: ' Obst ' }), 'Obst');
  assert.equal(validateName({ name: '' }), null);
});
