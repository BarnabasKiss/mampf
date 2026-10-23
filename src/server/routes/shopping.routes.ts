import { Router } from 'express';
import { requireAuth } from '../auth';
import { route, routeWithId } from '../http/helpers';
import { asBody, isNonEmptyString, normalizeAmount, toCategoryId } from '../validation/common';
import {
  validateBulkItems,
  validateItemList,
  validateName,
  validateTemplateInput,
} from '../validation/shopping.validation';
import * as shoppingService from '../services/shopping.service';

const router = Router();

router.use(requireAuth);

// Feste Pfade (/templates, /categories, /from-meals, /clear-checked) müssen VOR /:id stehen.

// ==================== Vorlagen ====================

router.get('/templates', route('Fehler beim Laden der Vorlagen.', (_req, res) => {
  res.json(shoppingService.getAllTemplates());
}));

router.get('/templates/:id', routeWithId('Fehler beim Laden der Vorlage.', (_req, res, id) => {
  const template = shoppingService.getTemplateById(id);
  if (!template) {
    res.status(404).json({ error: 'Vorlage nicht gefunden.' });
    return;
  }
  res.json(template);
}));

router.post('/templates', route('Fehler beim Erstellen der Vorlage.', (req, res) => {
  const input = validateTemplateInput(req.body);
  if (!input.ok) {
    res.status(400).json({ error: input.errors[0] });
    return;
  }
  res.status(201).json(shoppingService.createTemplate(input.value.name, input.value.items));
}));

router.put('/templates/:id', routeWithId('Fehler beim Bearbeiten der Vorlage.', (req, res, id) => {
  const input = validateTemplateInput(req.body);
  if (!input.ok) {
    res.status(400).json({ error: input.errors[0] });
    return;
  }

  const template = shoppingService.updateTemplate(id, input.value.name, input.value.items);
  if (!template) {
    res.status(404).json({ error: 'Vorlage nicht gefunden.' });
    return;
  }
  res.json(template);
}));

router.delete('/templates/:id', routeWithId('Fehler beim Löschen der Vorlage.', (_req, res, id) => {
  if (!shoppingService.deleteTemplate(id)) {
    res.status(404).json({ error: 'Vorlage nicht gefunden.' });
    return;
  }
  res.json({ success: true });
}));

// Vorlage auf die Einkaufsliste anwenden
router.post('/templates/:id/apply', routeWithId('Fehler beim Anwenden der Vorlage.', (_req, res, id) => {
  const items = shoppingService.applyTemplate(id);
  if (items.length === 0) {
    res.status(404).json({ error: 'Vorlage nicht gefunden.' });
    return;
  }
  res.status(201).json(items);
}));

// ==================== Kategorien ====================

router.get('/categories', route('Fehler beim Laden der Kategorien.', (_req, res) => {
  res.json(shoppingService.getAllCategories());
}));

router.post('/categories', route('Fehler beim Erstellen der Kategorie.', (req, res) => {
  const name = validateName(req.body);
  if (!name) {
    res.status(400).json({ error: 'Name ist erforderlich.' });
    return;
  }
  res.status(201).json(shoppingService.addCategory(name));
}));

router.put('/categories/:id', routeWithId('Fehler beim Umbenennen der Kategorie.', (req, res, id) => {
  const name = validateName(req.body);
  if (!name) {
    res.status(400).json({ error: 'Name ist erforderlich.' });
    return;
  }

  const category = shoppingService.renameCategory(id, name);
  if (!category) {
    res.status(404).json({ error: 'Kategorie nicht gefunden.' });
    return;
  }
  res.json(category);
}));

// Löscht die Kategorie samt Items; die letzte Kategorie bleibt erhalten.
router.delete('/categories/:id', routeWithId('Fehler beim Löschen der Kategorie.', (_req, res, id) => {
  const result = shoppingService.deleteCategory(id);
  if (!result.deleted) {
    res.status(409).json({ error: 'Die letzte Kategorie kann nicht gelöscht werden.' });
    return;
  }
  res.json({ success: true, deleted: result.itemsDeleted });
}));

// ==================== Einkaufsliste ====================

router.get('/', route('Fehler beim Laden der Einkaufsliste.', (_req, res) => {
  res.json(shoppingService.getAllItems());
}));

// Einzelnes Item oder Bulk (`items: [...]`)
router.post('/', route('Fehler beim Hinzufügen zur Einkaufsliste.', (req, res) => {
  const body = asBody(req.body);

  if (Array.isArray(body.items)) {
    const items = validateBulkItems(body.items);
    if (items.length === 0) {
      res.status(400).json({ error: 'Mindestens ein Item ist erforderlich.' });
      return;
    }
    res.status(201).json(shoppingService.addItems(items));
    return;
  }

  // Name darf leer sein, damit eine leere Zeile hinzugefügt werden kann.
  if (body.name !== undefined && body.name !== null && typeof body.name !== 'string') {
    res.status(400).json({ error: 'Name muss ein String sein.' });
    return;
  }

  const item = shoppingService.addItem(
    ((body.name as string | undefined) ?? '').trim(),
    normalizeAmount(body.amount),
    toCategoryId(body.category_id)
  );
  res.status(201).json(item);
}));

// Zutaten aus dem Wochenplan (gleiche Namen werden zusammengefasst)
router.post('/from-meals', route('Fehler beim Hinzufügen der Zutaten.', (req, res) => {
  const items = validateItemList(asBody(req.body).items);
  if (items.length === 0) {
    res.status(400).json({ error: 'Mindestens ein Item ist erforderlich.' });
    return;
  }
  res.status(201).json(shoppingService.addItemsFromMeals(items));
}));

router.post('/clear-checked', route('Fehler beim Löschen der abgehakten Items.', (_req, res) => {
  res.json({ success: true, deleted: shoppingService.clearCheckedItems() });
}));

router.put('/:id', routeWithId('Fehler beim Bearbeiten des Items.', (req, res, id) => {
  const body = asBody(req.body);

  if (!isNonEmptyString(body.name)) {
    res.status(400).json({ error: 'Name ist erforderlich.' });
    return;
  }

  const item = shoppingService.updateItem(
    id,
    body.name.trim(),
    normalizeAmount(body.amount),
    body.checked ? 1 : 0,
    toCategoryId(body.category_id) ?? undefined
  );
  if (!item) {
    res.status(404).json({ error: 'Item nicht gefunden.' });
    return;
  }
  res.json(item);
}));

router.delete('/:id', routeWithId('Fehler beim Löschen des Items.', (_req, res, id) => {
  if (!shoppingService.deleteItem(id)) {
    res.status(404).json({ error: 'Item nicht gefunden.' });
    return;
  }
  res.json({ success: true });
}));

export default router;
