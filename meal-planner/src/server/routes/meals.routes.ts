import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import * as mealService from '../services/meal.service';

const router = Router();

// Alle Routen benötigen Authentifizierung
router.use(requireAuth);

// GET /api/meals - Alle Gerichte laden
router.get('/', (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    let meals;

    if (search && search.trim().length > 0) {
      meals = mealService.searchMeals(search.trim());
    } else {
      meals = mealService.getAllMeals();
    }

    res.json(meals);
  } catch (error) {
    console.error('Fehler beim Laden der Gerichte:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Gerichte.' });
  }
});

// GET /api/meals/random - Zufällige Gerichte laden (muss VOR /:id stehen)
router.get('/random', (req: Request, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 3;
    const excludeIdsStr = req.query.exclude as string;
    const excludeIds = excludeIdsStr
      ? excludeIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      : [];

    const meals = mealService.getRandomMeals(count, excludeIds);
    res.json(meals);
  } catch (error) {
    console.error('Fehler beim Laden zufälliger Gerichte:', error);
    res.status(500).json({ error: 'Fehler beim Laden zufälliger Gerichte.' });
  }
});

// GET /api/meals/:id - Einzelnes Gericht laden
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungültige ID.' });
      return;
    }

    const meal = mealService.getMealById(id);
    if (!meal) {
      res.status(404).json({ error: 'Gericht nicht gefunden.' });
      return;
    }

    res.json(meal);
  } catch (error) {
    console.error('Fehler beim Laden des Gerichts:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Gerichts.' });
  }
});

// POST /api/meals - Gericht erstellen
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, difficulty, standard_portions, ingredients } = req.body;

    // Validierung
    const errors: string[] = [];

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Name ist erforderlich.');
    }

    const diff = parseInt(difficulty);
    if (isNaN(diff) || diff < 1 || diff > 3) {
      errors.push('Schwierigkeit muss 1, 2 oder 3 sein.');
    }

    const portions = parseInt(standard_portions);
    if (isNaN(portions) || portions < 1) {
      errors.push('Standardportionen müssen mindestens 1 sein.');
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      errors.push('Mindestens eine Zutat ist erforderlich.');
    } else {
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        if (!ing.name || typeof ing.name !== 'string' || ing.name.trim().length === 0) {
          errors.push(`Zutat ${i + 1}: Name ist erforderlich.`);
        }
        const pkgCount = parseFloat(ing.package_count);
        if (isNaN(pkgCount) || pkgCount <= 0) {
          errors.push(`Zutat ${i + 1}: Packungsanzahl muss größer als 0 sein.`);
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ error: 'Validierungsfehler.', details: errors });
      return;
    }

    const meal = mealService.createMeal({
      name: name.trim(),
      difficulty: diff,
      standard_portions: portions,
      ingredients: ingredients.map((ing: any, index: number) => ({
        name: ing.name.trim(),
        package_count: parseFloat(ing.package_count),
        sort_order: index,
      })),
    });

    res.status(201).json(meal);
  } catch (error) {
    console.error('Fehler beim Erstellen des Gerichts:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Gerichts.' });
  }
});

// PUT /api/meals/:id - Gericht bearbeiten
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungültige ID.' });
      return;
    }

    const { name, difficulty, standard_portions, ingredients } = req.body;

    // Validierung
    const errors: string[] = [];

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Name ist erforderlich.');
    }

    const diff = parseInt(difficulty);
    if (isNaN(diff) || diff < 1 || diff > 3) {
      errors.push('Schwierigkeit muss 1, 2 oder 3 sein.');
    }

    const portions = parseInt(standard_portions);
    if (isNaN(portions) || portions < 1) {
      errors.push('Standardportionen müssen mindestens 1 sein.');
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      errors.push('Mindestens eine Zutat ist erforderlich.');
    } else {
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        if (!ing.name || typeof ing.name !== 'string' || ing.name.trim().length === 0) {
          errors.push(`Zutat ${i + 1}: Name ist erforderlich.`);
        }
        const pkgCount = parseFloat(ing.package_count);
        if (isNaN(pkgCount) || pkgCount <= 0) {
          errors.push(`Zutat ${i + 1}: Packungsanzahl muss größer als 0 sein.`);
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ error: 'Validierungsfehler.', details: errors });
      return;
    }

    const meal = mealService.updateMeal(id, {
      name: name.trim(),
      difficulty: diff,
      standard_portions: portions,
      ingredients: ingredients.map((ing: any, index: number) => ({
        name: ing.name.trim(),
        package_count: parseFloat(ing.package_count),
        sort_order: index,
      })),
    });

    if (!meal) {
      res.status(404).json({ error: 'Gericht nicht gefunden.' });
      return;
    }

    res.json(meal);
  } catch (error) {
    console.error('Fehler beim Bearbeiten des Gerichts:', error);
    res.status(500).json({ error: 'Fehler beim Bearbeiten des Gerichts.' });
  }
});

// DELETE /api/meals/:id - Gericht löschen
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungültige ID.' });
      return;
    }

    const deleted = mealService.deleteMeal(id);
    if (!deleted) {
      res.status(404).json({ error: 'Gericht nicht gefunden.' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Gerichts:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Gerichts.' });
  }
});

export default router;