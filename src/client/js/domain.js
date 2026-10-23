/**
 * Reine Fachlogik ohne DOM-Zugriff (leicht testbar).
 */

export const DIFFICULTIES = [
  { value: 1, label: 'Einfach', css: 'easy' },
  { value: 2, label: 'Mittel', css: 'medium' },
  { value: 3, label: 'Schwer', css: 'hard' },
];

/** Benötigte Packungen für die gewünschte Portionszahl (immer aufgerundet). */
export function calculatePackages(packageCount, standardPortions, desiredPortions) {
  // Kleine Toleranz gegen Gleitkomma-Artefakte (z. B. 1.0000000000000002 → 2).
  return Math.ceil(packageCount * (desiredPortions / standardPortions) - 1e-9);
}

export function ingredientsPreview(ingredients) {
  if (!ingredients || ingredients.length === 0) return '–';
  return ingredients.map((ing) => ing.name).join(', ');
}

/** Zutaten eines Plan-Eintrags mit skalierten Mengen. */
export function scaledIngredients({ meal, portions }) {
  return meal.ingredients.map((ing) => ({
    name: ing.name,
    packages: calculatePackages(ing.package_count, meal.standard_portions, portions),
  }));
}

/** Text im WhatsApp-Format (`*fett*`). */
export function buildWhatsAppText(plan) {
  return plan
    .map((entry) => {
      const lines = scaledIngredients(entry).map((ing) => `- ${ing.packages} Stk. ${ing.name}`);
      return [`*${entry.meal.name}*`, `*${entry.portions} Portionen*`, ...lines].join('\n');
    })
    .join('\n\n');
}

/** Einträge für `POST /api/shopping-list/from-meals`. */
export function planToShoppingItems(plan) {
  return plan.flatMap((entry) =>
    scaledIngredients(entry).map((ing) => ({ name: ing.name, amount: String(ing.packages) }))
  );
}

/** Teilt Einkaufsartikel in Kategorie-Gruppen ("Allgemein" = ohne Kategorie, immer zuerst). */
export function groupShoppingItems(items, categories) {
  const groups = [{ category: null, items: items.filter((i) => i.category_id == null) }];
  for (const category of categories) {
    groups.push({ category, items: items.filter((i) => i.category_id == category.id) });
  }
  return groups;
}

/** Abgehakte Artikel nach unten, sonst nach ID. */
export function sortShoppingItems(items) {
  return [...items].sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0) || a.id - b.id);
}

/** Vergleicht zwei Listen anhand der angegebenen Felder (für das Polling). */
export function sameList(a, b, fields) {
  return a.length === b.length && a.every((item, i) => fields.every((f) => item[f] === b[i][f]));
}

/** Filtert nach Schwierigkeit (0/leer = alle) und sortiert; liefert eine neue Liste. */
export function filterAndSortMeals(meals, { difficulty = 0, sort = 'name' } = {}) {
  const byName = (a, b) => a.name.localeCompare(b.name, 'de');
  const comparators = {
    name: byName,
    recent: (a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')) || byName(a, b),
    difficulty: (a, b) => a.difficulty - b.difficulty || byName(a, b),
  };
  return meals
    .filter((meal) => !difficulty || meal.difficulty === difficulty)
    .sort(comparators[sort] ?? byName);
}
