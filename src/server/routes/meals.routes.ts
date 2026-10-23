import { Router } from 'express';
import { requireAuth } from '../auth';
import { route, routeWithId } from '../http/helpers';
import { validateMealInput } from '../validation/meal.validation';
import * as mealService from '../services/meal.service';

const router = Router();

router.use(requireAuth);

// GET /api/meals – alle Gerichte (optional ?search=)
router.get('/', route('Fehler beim Laden der Gerichte.', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  res.json(search ? mealService.searchMeals(search) : mealService.getAllMeals());
}));

// GET /api/meals/random – zufällige Gerichte (muss VOR /:id stehen)
router.get('/random', route('Fehler beim Laden zufälliger Gerichte.', (req, res) => {
  const count = parseInt(String(req.query.count), 10) || 3;
  const exclude = typeof req.query.exclude === 'string' ? req.query.exclude : '';
  const excludeIds = exclude
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id));

  res.json(mealService.getRandomMeals(count, excludeIds));
}));

// GET /api/meals/:id
router.get('/:id', routeWithId('Fehler beim Laden des Gerichts.', (_req, res, id) => {
  const meal = mealService.getMealById(id);
  if (!meal) {
    res.status(404).json({ error: 'Gericht nicht gefunden.' });
    return;
  }
  res.json(meal);
}));

// POST /api/meals
router.post('/', route('Fehler beim Erstellen des Gerichts.', (req, res) => {
  const input = validateMealInput(req.body);
  if (!input.ok) {
    res.status(400).json({ error: 'Validierungsfehler.', details: input.errors });
    return;
  }
  res.status(201).json(mealService.createMeal(input.value));
}));

// PUT /api/meals/:id
router.put('/:id', routeWithId('Fehler beim Bearbeiten des Gerichts.', (req, res, id) => {
  const input = validateMealInput(req.body);
  if (!input.ok) {
    res.status(400).json({ error: 'Validierungsfehler.', details: input.errors });
    return;
  }

  const meal = mealService.updateMeal(id, input.value);
  if (!meal) {
    res.status(404).json({ error: 'Gericht nicht gefunden.' });
    return;
  }
  res.json(meal);
}));

// DELETE /api/meals/:id
router.delete('/:id', routeWithId('Fehler beim Löschen des Gerichts.', (_req, res, id) => {
  if (!mealService.deleteMeal(id)) {
    res.status(404).json({ error: 'Gericht nicht gefunden.' });
    return;
  }
  res.json({ success: true });
}));

export default router;
