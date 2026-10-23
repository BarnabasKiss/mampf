import { getDatabase } from '../database';

export interface Ingredient {
  id?: number;
  meal_id?: number;
  name: string;
  package_count: number;
  sort_order: number;
}

export interface Meal {
  id?: number;
  name: string;
  difficulty: number;
  standard_portions: number;
  created_at?: string;
  updated_at?: string;
  ingredients: Ingredient[];
}

export type MealInput = Pick<Meal, 'name' | 'difficulty' | 'standard_portions'> & {
  ingredients: Ingredient[];
};

interface MealRow {
  id: number;
  name: string;
  difficulty: number;
  standard_portions: number;
  created_at: string;
  updated_at: string;
}

interface IngredientRow {
  id: number;
  meal_id: number;
  name: string;
  package_count: number;
  sort_order: number;
}

/** Hängt die Zutaten an die Gerichte (eine Abfrage, Gruppierung per Map). */
function hydrate(meals: MealRow[]): Meal[] {
  if (meals.length === 0) return [];

  const rows = getDatabase()
    .prepare('SELECT * FROM ingredients ORDER BY sort_order ASC, id ASC')
    .all() as IngredientRow[];

  const byMeal = new Map<number, Ingredient[]>();
  for (const row of rows) {
    const list = byMeal.get(row.meal_id) ?? [];
    list.push({
      id: row.id,
      meal_id: row.meal_id,
      name: row.name,
      package_count: row.package_count,
      sort_order: row.sort_order,
    });
    byMeal.set(row.meal_id, list);
  }

  return meals.map(meal => ({ ...meal, ingredients: byMeal.get(meal.id) ?? [] }));
}

function replaceIngredients(mealId: number, ingredients: Ingredient[]): void {
  const db = getDatabase();
  db.prepare('DELETE FROM ingredients WHERE meal_id = ?').run(mealId);
  const insert = db.prepare(
    'INSERT INTO ingredients (meal_id, name, package_count, sort_order) VALUES (?, ?, ?, ?)'
  );
  for (const ing of ingredients) {
    insert.run(mealId, ing.name, ing.package_count, ing.sort_order);
  }
}

export function getAllMeals(): Meal[] {
  const meals = getDatabase().prepare('SELECT * FROM meals ORDER BY name ASC').all() as MealRow[];
  return hydrate(meals);
}

export function searchMeals(query: string): Meal[] {
  const meals = getDatabase()
    .prepare('SELECT * FROM meals WHERE name LIKE ? ORDER BY name ASC')
    .all(`%${query}%`) as MealRow[];
  return hydrate(meals);
}

export function getMealById(id: number): Meal | undefined {
  const meal = getDatabase().prepare('SELECT * FROM meals WHERE id = ?').get(id) as MealRow | undefined;
  return meal ? hydrate([meal])[0] : undefined;
}

export function createMeal(meal: MealInput): Meal {
  const db = getDatabase();
  const create = db.transaction((input: MealInput): number => {
    const result = db
      .prepare('INSERT INTO meals (name, difficulty, standard_portions) VALUES (?, ?, ?)')
      .run(input.name, input.difficulty, input.standard_portions);
    const id = Number(result.lastInsertRowid);
    replaceIngredients(id, input.ingredients);
    return id;
  });
  return getMealById(create(meal))!;
}

export function updateMeal(id: number, meal: MealInput): Meal | undefined {
  const db = getDatabase();
  const update = db.transaction((input: MealInput): boolean => {
    const result = db
      .prepare(
        "UPDATE meals SET name = ?, difficulty = ?, standard_portions = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .run(input.name, input.difficulty, input.standard_portions, id);
    if (result.changes === 0) return false;
    replaceIngredients(id, input.ingredients);
    return true;
  });
  return update(meal) ? getMealById(id) : undefined;
}

export function deleteMeal(id: number): boolean {
  return getDatabase().prepare('DELETE FROM meals WHERE id = ?').run(id).changes > 0;
}

export function getRandomMeals(count: number, excludeIds: number[] = []): Meal[] {
  const params: number[] = [];
  let query = 'SELECT * FROM meals';

  if (excludeIds.length > 0) {
    query += ` WHERE id NOT IN (${excludeIds.map(() => '?').join(', ')})`;
    params.push(...excludeIds);
  }

  query += ' ORDER BY RANDOM()';

  if (count > 0) {
    query += ' LIMIT ?';
    params.push(count);
  }

  return hydrate(getDatabase().prepare(query).all(...params) as MealRow[]);
}
