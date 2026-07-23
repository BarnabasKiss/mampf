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

export interface MealRow {
  id: number;
  name: string;
  difficulty: number;
  standard_portions: number;
  created_at: string;
  updated_at: string;
}

export interface IngredientRow {
  id: number;
  meal_id: number;
  name: string;
  package_count: number;
  sort_order: number;
}

export function getAllMeals(): Meal[] {
  const db = getDatabase();
  const meals = db.prepare('SELECT * FROM meals ORDER BY name ASC').all() as MealRow[];
  const ingredients = db.prepare('SELECT * FROM ingredients ORDER BY sort_order ASC').all() as IngredientRow[];

  return meals.map(meal => ({
    ...meal,
    ingredients: ingredients
      .filter(ing => ing.meal_id === meal.id)
      .map(ing => ({
        id: ing.id,
        meal_id: ing.meal_id,
        name: ing.name,
        package_count: ing.package_count,
        sort_order: ing.sort_order,
      })),
  }));
}

export function getMealById(id: number): Meal | undefined {
  const db = getDatabase();
  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(id) as MealRow | undefined;
  if (!meal) return undefined;

  const ingredients = db.prepare('SELECT * FROM ingredients WHERE meal_id = ? ORDER BY sort_order ASC').all(id) as IngredientRow[];

  return {
    ...meal,
    ingredients: ingredients.map(ing => ({
      id: ing.id,
      meal_id: ing.meal_id,
      name: ing.name,
      package_count: ing.package_count,
      sort_order: ing.sort_order,
    })),
  };
}

export function createMeal(meal: Meal): Meal {
  const db = getDatabase();

  const insertMeal = db.prepare(
    'INSERT INTO meals (name, difficulty, standard_portions) VALUES (?, ?, ?)'
  );
  const result = insertMeal.run(meal.name, meal.difficulty, meal.standard_portions);
  const mealId = result.lastInsertRowid as number;

  const insertIngredient = db.prepare(
    'INSERT INTO ingredients (meal_id, name, package_count, sort_order) VALUES (?, ?, ?, ?)'
  );

  const insertMany = db.transaction((ingredients: Ingredient[]) => {
    for (const ing of ingredients) {
      insertIngredient.run(mealId, ing.name, ing.package_count, ing.sort_order);
    }
  });

  insertMany(meal.ingredients);

  return getMealById(mealId)!;
}

export function updateMeal(id: number, meal: Meal): Meal | undefined {
  const db = getDatabase();
  const existing = getMealById(id);
  if (!existing) return undefined;

  const updateMealStmt = db.prepare(
    'UPDATE meals SET name = ?, difficulty = ?, standard_portions = ?, updated_at = datetime(\'now\') WHERE id = ?'
  );
  updateMealStmt.run(meal.name, meal.difficulty, meal.standard_portions, id);

  // Zutaten löschen und neu einfügen
  db.prepare('DELETE FROM ingredients WHERE meal_id = ?').run(id);

  const insertIngredient = db.prepare(
    'INSERT INTO ingredients (meal_id, name, package_count, sort_order) VALUES (?, ?, ?, ?)'
  );

  const insertMany = db.transaction((ingredients: Ingredient[]) => {
    for (const ing of ingredients) {
      insertIngredient.run(id, ing.name, ing.package_count, ing.sort_order);
    }
  });

  insertMany(meal.ingredients);

  return getMealById(id);
}

export function deleteMeal(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM meals WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getRandomMeals(count: number, excludeIds: number[] = []): Meal[] {
  const db = getDatabase();

  let query = 'SELECT * FROM meals';
  const params: number[] = [];

  if (excludeIds.length > 0) {
    const placeholders = excludeIds.map(() => '?').join(', ');
    query += ` WHERE id NOT IN (${placeholders})`;
    params.push(...excludeIds);
  }

  query += ' ORDER BY RANDOM()';

  if (count > 0) {
    query += ' LIMIT ?';
    params.push(count);
  }

  const meals = db.prepare(query).all(...params) as MealRow[];
  const allIngredients = db.prepare('SELECT * FROM ingredients ORDER BY sort_order ASC').all() as IngredientRow[];

  return meals.map(meal => ({
    ...meal,
    ingredients: allIngredients
      .filter(ing => ing.meal_id === meal.id)
      .map(ing => ({
        id: ing.id,
        meal_id: ing.meal_id,
        name: ing.name,
        package_count: ing.package_count,
        sort_order: ing.sort_order,
      })),
  }));
}

export function searchMeals(query: string): Meal[] {
  const db = getDatabase();
  const meals = db.prepare('SELECT * FROM meals WHERE name LIKE ? ORDER BY name ASC').all(`%${query}%`) as MealRow[];
  const allIngredients = db.prepare('SELECT * FROM ingredients ORDER BY sort_order ASC').all() as IngredientRow[];

  return meals.map(meal => ({
    ...meal,
    ingredients: allIngredients
      .filter(ing => ing.meal_id === meal.id)
      .map(ing => ({
        id: ing.id,
        meal_id: ing.meal_id,
        name: ing.name,
        package_count: ing.package_count,
        sort_order: ing.sort_order,
      })),
  }));
}