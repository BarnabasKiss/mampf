import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { closeDatabase, getDatabase, initializeDatabase } from '../database';
import * as meals from './meal.service';
import * as shopping from './shopping.service';

before(() => {
  process.env.DATABASE_PATH = ':memory:';
  initializeDatabase();
});

beforeEach(() => {
  const db = getDatabase();
  for (const table of ['ingredients', 'meals', 'shopping_list_items', 'shopping_template_items', 'shopping_templates', 'shopping_categories']) {
    db.exec(`DELETE FROM ${table}`);
  }
});

after(() => closeDatabase());

const mealInput = (name: string, ingredientNames: string[] = ['A']): meals.MealInput => ({
  name,
  difficulty: 1,
  standard_portions: 2,
  ingredients: ingredientNames.map((n, i) => ({ name: n, package_count: 1, sort_order: i })),
});

test('meals: CRUD inkl. Zutatenreihenfolge', () => {
  const created = meals.createMeal(mealInput('Pasta', ['Nudeln', 'Soße']));
  assert.ok(created.id);
  assert.deepEqual(created.ingredients.map(i => i.name), ['Nudeln', 'Soße']);

  const updated = meals.updateMeal(created.id!, mealInput('Pasta 2', ['Käse']));
  assert.equal(updated?.name, 'Pasta 2');
  assert.deepEqual(updated?.ingredients.map(i => i.name), ['Käse']);

  assert.equal(meals.updateMeal(9999, mealInput('x')), undefined);
  assert.ok(meals.deleteMeal(created.id!));
  assert.ok(!meals.deleteMeal(created.id!));
  assert.equal(meals.getMealById(created.id!), undefined);
});

test('meals: Suche, Sortierung, Zutaten pro Gericht getrennt', () => {
  meals.createMeal(mealInput('Zwiebelsuppe', ['Zwiebel']));
  meals.createMeal(mealInput('Apfelkuchen', ['Apfel', 'Mehl']));

  const all = meals.getAllMeals();
  assert.deepEqual(all.map(m => m.name), ['Apfelkuchen', 'Zwiebelsuppe']);
  assert.deepEqual(all[0].ingredients.map(i => i.name), ['Apfel', 'Mehl']);
  assert.deepEqual(all[1].ingredients.map(i => i.name), ['Zwiebel']);

  assert.deepEqual(meals.searchMeals('suppe').map(m => m.name), ['Zwiebelsuppe']);
});

test('meals: getRandomMeals respektiert count und exclude', () => {
  const ids = ['a', 'b', 'c', 'd'].map(n => meals.createMeal(mealInput(n)).id!);
  assert.equal(meals.getRandomMeals(2).length, 2);
  const rest = meals.getRandomMeals(10, ids.slice(0, 3));
  assert.deepEqual(rest.map(m => m.id), [ids[3]]);
  assert.deepEqual(meals.getRandomMeals(3, ids), []);
});

test('shopping: Items, Abhaken, Löschen', () => {
  const item = shopping.addItem('Milch', '2', null);
  assert.equal(item.checked, 0);

  const updated = shopping.updateItem(item.id!, 'Hafermilch', '3', 1);
  assert.equal(updated?.name, 'Hafermilch');
  assert.equal(updated?.checked, 1);
  assert.equal(shopping.updateItem(9999, 'x', '1', 0), undefined);

  shopping.addItem('Brot', '1');
  assert.equal(shopping.clearCheckedItems(), 1);
  assert.equal(shopping.getAllItems().length, 1);
  assert.ok(shopping.deleteItem(shopping.getAllItems()[0].id!));
});

test('shopping: addItemsFromMeals fasst gleiche Namen zusammen', () => {
  const result = shopping.addItemsFromMeals([
    { name: 'zwiebel', amount: '1' },
    { name: 'Zwiebel', amount: '2' },
    { name: 'Mehl', amount: '1' },
  ]);
  assert.deepEqual(result.map(i => [i.name, i.amount]), [['Zwiebel', '1 + 2'], ['Mehl', '1']]);
});

test('shopping: Kategorien – letzte nicht löschbar, Items werden mitgelöscht', () => {
  const a = shopping.addCategory('Obst');
  assert.deepEqual(shopping.deleteCategory(a.id!), { deleted: false, itemsDeleted: 0 });

  const b = shopping.addCategory('Gemüse');
  assert.equal(b.sort_order, 1);
  shopping.addItem('Apfel', '1', a.id);
  shopping.addItem('Möhre', '1', b.id);

  assert.equal(shopping.renameCategory(a.id!, 'Früchte')?.name, 'Früchte');
  assert.equal(shopping.renameCategory(9999, 'x'), undefined);

  assert.deepEqual(shopping.deleteCategory(a.id!), { deleted: true, itemsDeleted: 1 });
  assert.deepEqual(shopping.getAllItems().map(i => i.name), ['Möhre']);
});

test('shopping: Vorlagen CRUD und Anwenden', () => {
  const template = shopping.createTemplate('Basics', [
    { name: 'Milch', amount: '1', sort_order: 0 },
    { name: 'Brot', amount: '2', sort_order: 1 },
  ]);
  assert.deepEqual(template.items.map(i => i.name), ['Milch', 'Brot']);

  const updated = shopping.updateTemplate(template.id!, 'Basics+', [{ name: 'Eier', amount: '10', sort_order: 0 }]);
  assert.equal(updated?.name, 'Basics+');
  assert.deepEqual(updated?.items.map(i => i.name), ['Eier']);
  assert.equal(shopping.updateTemplate(9999, 'x', []), undefined);

  assert.deepEqual(shopping.applyTemplate(template.id!).map(i => i.name), ['Eier']);
  assert.deepEqual(shopping.applyTemplate(9999), []);

  assert.ok(shopping.deleteTemplate(template.id!));
  assert.equal(shopping.getAllTemplates().length, 0);
});
