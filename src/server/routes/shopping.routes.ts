import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import * as shoppingService from '../services/shopping.service';

const router = Router();

// Alle Routen benötigen Authentifizierung
router.use(requireAuth);

// ==================== Vorlagen (muss VOR /:id stehen) ====================

// GET /api/shopping-list/templates - Alle Vorlagen laden
router.get('/templates', (req: Request, res: Response) => {
  try {
    const templates = shoppingService.getAllTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Fehler beim Laden der Vorlagen:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Vorlagen.' });
  }
});

// GET /api/shopping-list/templates/:id - Einzelne Vorlage laden
router.get('/templates/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungültige ID.' });
      return;
    }

    const template = shoppingService.getTemplateById(id);
    if (!template) {
      res.status(404).json({ error: 'Vorlage nicht gefunden.' });
      return;
    }

    res.json(template);
  } catch (error) {
    console.error('Fehler beim Laden der Vorlage:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Vorlage.' });
  }
});

// POST /api/shopping-list/templates - Vorlage erstellen
router.post('/templates', (req: Request, res: Response) => {
  try {
    const { name, items } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Name ist erforderlich.' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Mindestens ein Item ist erforderlich.' });
      return;
    }

    const validItems = items
      .filter((item: any) => item && typeof item.name === 'string' && item.name.trim().length > 0)
      .map((item: any, index: number) => ({
        name: item.name.trim(),
        amount: (item.amount !== undefined && item.amount !== null && String(item.amount).trim() !== '')
          ? String(item.amount).trim()
          : '1',
        sort_order: index,
      }));

    if (validItems.length === 0) {
      res.status(400).json({ error: 'Mindestens ein Item ist erforderlich.' });
      return;
    }

    const template = shoppingService.createTemplate(name.trim(), validItems);
    res.status(201).json(template);
  } catch (error) {
    console.error('Fehler beim Erstellen der Vorlage:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Vorlage.' });
  }
});

// PUT /api/shopping-list/templates/:id - Vorlage bearbeiten
router.put('/templates/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungültige ID.' });
      return;
    }

    const { name, items } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Name ist erforderlich.' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Mindestens ein Item ist erforderlich.' });
      return;
    }

    const validItems = items
      .filter((item: any) => item && typeof item.name === 'string' && item.name.trim().length > 0)
      .map((item: any, index: number) => ({
        name: item.name.trim(),
        amount: (item.amount !== undefined && item.amount !== null && String(item.amount).trim() !== '')
          ? String(item.amount).trim()
          : '1',
        sort_order: index,
      }));

    if (validItems.length === 0) {
      res.status(400).json({ error: 'Mindestens ein Item ist erforderlich.' });
      return;
    }

    const template = shoppingService.updateTemplate(id, name.trim(), validItems);
    if (!template) {
      res.status(404).json({ error: 'Vorlage nicht gefunden.' });
      return;
    }

    res.json(template);
  } catch (error) {
    console.error('Fehler beim Bearbeiten der Vorlage:', error);
    res.status(500).json({ error: 'Fehler beim Bearbeiten der Vorlage.' });
  }
});

// DELETE /api/shopping-list/templates/:id - Vorlage löschen
router.delete('/templates/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungültige ID.' });
      return;
    }

    const deleted = shoppingService.deleteTemplate(id);
    if (!deleted) {
      res.status(404).json({ error: 'Vorlage nicht gefunden.' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der Vorlage:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Vorlage.' });
  }
});

// POST /api/shopping-list/templates/:id/apply - Vorlage auf Einkaufsliste anwenden
router.post('/templates/:id/apply', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungültige ID.' });
      return;
    }

    const items = shoppingService.applyTemplate(id);
    if (items.length === 0) {
      res.status(404).json({ error: 'Vorlage nicht gefunden.' });
      return;
    }

    res.status(201).json(items);
  } catch (error) {
    console.error('Fehler beim Anwenden der Vorlage:', error);
    res.status(500).json({ error: 'Fehler beim Anwenden der Vorlage.' });
  }
});

// ==================== Einkaufsliste ====================

// GET /api/shopping-list - Alle Einkaufslisten-Items laden
router.get('/', (req: Request, res: Response) => {
  try {
    const items = shoppingService.getAllItems();
    res.json(items);
  } catch (error) {
    console.error('Fehler beim Laden der Einkaufsliste:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Einkaufsliste.' });
  }
});

// POST /api/shopping-list - Item(s) hinzufügen
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, amount, items } = req.body;

    // Bulk-Add (z.B. von Vorlagen oder Wochenplan)
    if (Array.isArray(items)) {
      const validItems = items
        .filter((item: any) => item && typeof item.name === 'string' && item.name.trim().length > 0)
        .map((item: any) => ({
          name: item.name.trim(),
          amount: (item.amount !== undefined && item.amount !== null && String(item.amount).trim() !== '')
            ? String(item.amount).trim()
            : '1',
        }));

      if (validItems.length === 0) {
        res.status(400).json({ error: 'Mindestens ein Item ist erforderlich.' });
        return;
      }

      const result = shoppingService.addItems(validItems);
      res.status(201).json(result);
      return;
    }

    // Einzelnes Item (Name darf leer sein, damit eine leere Zeile hinzugefügt werden kann)
    if (name !== undefined && name !== null && typeof name !== 'string') {
      res.status(400).json({ error: 'Name muss ein String sein.' });
      return;
    }

    const item = shoppingService.addItem(
      (name || '').trim(),
      (amount !== undefined && amount !== null && String(amount).trim() !== '') ? String(amount).trim() : '1'
    );
    res.status(201).json(item);
  } catch (error) {
    console.error('Fehler beim Hinzufügen zur Einkaufsliste:', error);
    res.status(500).json({ error: 'Fehler beim Hinzufügen zur Einkaufsliste.' });
  }
});

// POST /api/shopping-list/from-meals - Zutaten vom Wochenplan hinzufügen
router.post('/from-meals', (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Mindestens ein Item ist erforderlich.' });
      return;
    }

    const validItems = items
      .filter((item: any) => item && typeof item.name === 'string' && item.name.trim().length > 0)
      .map((item: any) => ({
        name: item.name.trim(),
        amount: (item.amount !== undefined && item.amount !== null && String(item.amount).trim() !== '')
          ? String(item.amount).trim()
          : '1',
      }));

    if (validItems.length === 0) {
      res.status(400).json({ error: 'Mindestens ein Item ist erforderlich.' });
      return;
    }

    const result = shoppingService.addItemsFromMeals(validItems);
    res.status(201).json(result);
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Zutaten:', error);
    res.status(500).json({ error: 'Fehler beim Hinzufügen der Zutaten.' });
  }
});

// POST /api/shopping-list/clear-checked - Abgehakte Items löschen
router.post('/clear-checked', (req: Request, res: Response) => {
  try {
    const count = shoppingService.clearCheckedItems();
    res.json({ success: true, deleted: count });
  } catch (error) {
    console.error('Fehler beim Löschen der abgehakten Items:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der abgehakten Items.' });
  }
});

// PUT /api/shopping-list/:id - Item bearbeiten
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungültige ID.' });
      return;
    }

    const { name, amount, checked } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Name ist erforderlich.' });
      return;
    }

    const item = shoppingService.updateItem(
      id,
      name.trim(),
      (amount !== undefined && amount !== null && String(amount).trim() !== '') ? String(amount).trim() : '1',
      checked ? 1 : 0
    );

    if (!item) {
      res.status(404).json({ error: 'Item nicht gefunden.' });
      return;
    }

    res.json(item);
  } catch (error) {
    console.error('Fehler beim Bearbeiten des Items:', error);
    res.status(500).json({ error: 'Fehler beim Bearbeiten des Items.' });
  }
});

// DELETE /api/shopping-list/:id - Item löschen
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungültige ID.' });
      return;
    }

    const deleted = shoppingService.deleteItem(id);
    if (!deleted) {
      res.status(404).json({ error: 'Item nicht gefunden.' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Items:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Items.' });
  }
});

export default router;