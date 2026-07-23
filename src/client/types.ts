// Typdefinitionen für das Frontend (als Referenz, nicht kompiliert)
// Diese Datei dient nur der Dokumentation der Datenstrukturen

interface Ingredient {
  id?: number;
  meal_id?: number;
  name: string;
  package_count: number;
  sort_order: number;
}

interface Meal {
  id?: number;
  name: string;
  difficulty: number;
  standard_portions: number;
  created_at?: string;
  updated_at?: string;
  ingredients: Ingredient[];
}

interface PlanItem {
  meal: Meal;
  portions: number;
}

interface ApiError {
  error: string;
  details?: string[];
}