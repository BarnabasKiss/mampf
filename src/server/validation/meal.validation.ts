import { Body, ValidationResult, asBody, isNonEmptyString } from './common';

export interface MealInput {
  name: string;
  difficulty: number;
  standard_portions: number;
  ingredients: { name: string; package_count: number; sort_order: number }[];
}

export function validateMealInput(raw: unknown): ValidationResult<MealInput> {
  const body: Body = asBody(raw);
  const errors: string[] = [];

  if (!isNonEmptyString(body.name)) {
    errors.push('Name ist erforderlich.');
  }

  const difficulty = parseInt(String(body.difficulty), 10);
  if (isNaN(difficulty) || difficulty < 1 || difficulty > 3) {
    errors.push('Schwierigkeit muss 1, 2 oder 3 sein.');
  }

  const portions = parseInt(String(body.standard_portions), 10);
  if (isNaN(portions) || portions < 1) {
    errors.push('Standardportionen müssen mindestens 1 sein.');
  }

  const rawIngredients = body.ingredients;
  const ingredients: MealInput['ingredients'] = [];
  if (!Array.isArray(rawIngredients) || rawIngredients.length === 0) {
    errors.push('Mindestens eine Zutat ist erforderlich.');
  } else {
    rawIngredients.forEach((entry: unknown, index: number) => {
      const ing = asBody(entry);
      if (!isNonEmptyString(ing.name)) {
        errors.push(`Zutat ${index + 1}: Name ist erforderlich.`);
      }
      const packageCount = parseFloat(String(ing.package_count));
      if (isNaN(packageCount) || packageCount <= 0) {
        errors.push(`Zutat ${index + 1}: Packungsanzahl muss größer als 0 sein.`);
      }
      ingredients.push({
        name: typeof ing.name === 'string' ? ing.name.trim() : '',
        package_count: packageCount,
        sort_order: index,
      });
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name: (body.name as string).trim(),
      difficulty,
      standard_portions: portions,
      ingredients,
    },
  };
}
