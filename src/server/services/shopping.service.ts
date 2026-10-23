import { getDatabase } from '../database';

export interface ShoppingCategory {
  id?: number;
  name: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ShoppingItem {
  id?: number;
  name: string;
  amount: string;
  checked?: number;
  category_id?: number | null;
  category_name?: string | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ShoppingItemRow {
  id: number;
  name: string;
  amount: string;
  checked: number;
  category_id: number | null;
  category_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingTemplate {
  id?: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  items: ShoppingTemplateItem[];
}

export interface ShoppingTemplateItem {
  id?: number;
  template_id?: number;
  name: string;
  amount: string;
  sort_order: number;
}

export interface ShoppingTemplateRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ShoppingTemplateItemRow {
  id: number;
  template_id: number;
  name: string;
  amount: string;
  sort_order: number;
}

// ==================== Einkaufsliste ====================

export function getAllItems(): ShoppingItem[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT i.*, c.name AS category_name
    FROM shopping_list_items i
    LEFT JOIN shopping_categories c ON i.category_id = c.id
    ORDER BY i.id ASC
  `).all() as ShoppingItem[];
}

export function addItem(name: string, amount: string, categoryId?: number | null): ShoppingItem {
  const result = getDatabase()
    .prepare('INSERT INTO shopping_list_items (name, amount, category_id) VALUES (?, ?, ?)')
    .run(name, amount, categoryId ?? null);
  return getItemById(Number(result.lastInsertRowid))!;
}

export interface NewShoppingItem {
  name: string;
  amount: string;
  category_id?: number | null;
}

/** Fügt mehrere Items atomar hinzu und liefert die komplette Liste zurück. */
export function addItems(items: NewShoppingItem[]): ShoppingItem[] {
  const db = getDatabase();
  const insert = db.prepare('INSERT INTO shopping_list_items (name, amount, category_id) VALUES (?, ?, ?)');
  db.transaction((toInsert: NewShoppingItem[]) => {
    for (const item of toInsert) {
      insert.run(item.name, item.amount, item.category_id ?? null);
    }
  })(items);
  return getAllItems();
}

export function getItemById(id: number): ShoppingItem | undefined {
  const db = getDatabase();
  return db.prepare(`
    SELECT i.*, c.name AS category_name
    FROM shopping_list_items i
    LEFT JOIN shopping_categories c ON i.category_id = c.id
    WHERE i.id = ?
  `).get(id) as ShoppingItem | undefined;
}

export function updateItem(id: number, name: string, amount: string, checked: number, categoryId?: number | null): ShoppingItem | undefined {
  const db = getDatabase();
  if (!getItemById(id)) return undefined;

  if (categoryId !== undefined && categoryId !== null) {
    db.prepare(
      'UPDATE shopping_list_items SET name = ?, amount = ?, checked = ?, category_id = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(name, amount, checked, categoryId, id);
  } else {
    db.prepare(
      'UPDATE shopping_list_items SET name = ?, amount = ?, checked = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(name, amount, checked, id);
  }

  return getItemById(id);
}

export function deleteItem(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM shopping_list_items WHERE id = ?').run(id);
  return result.changes > 0;
}

export function clearCheckedItems(): number {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM shopping_list_items WHERE checked = 1').run();
  return result.changes;
}

const NUMERIC_AMOUNT = /^\d+(?:[.,]\d+)?$/;

const parseAmount = (amount: string): number | null =>
  NUMERIC_AMOUNT.test(amount.trim()) ? parseFloat(amount.trim().replace(',', '.')) : null;

/** Formatiert eine Summe; übernimmt das Komma, wenn eine der Mengen eines verwendet hat. */
function formatAmount(value: number, useComma: boolean): string {
  const text = String(Math.round(value * 100) / 100);
  return useComma ? text.replace('.', ',') : text;
}

/**
 * Fügt Zutaten aus dem Wochenplan hinzu und führt Gleiches zusammen:
 *  - gleiche Namen (ohne Groß-/Kleinschreibung) werden innerhalb der Anfrage addiert,
 *  - ein bereits vorhandener, nicht abgehakter Artikel mit gleichem Namen wird hochgezählt.
 * Zusammengeführt wird nur bei rein numerischen Mengen ("2" + "1" = "3");
 * andere Mengen ("500 g") bleiben getrennt bzw. werden mit " + " verbunden.
 */
export function addItemsFromMeals(items: { name: string; amount: string }[]): ShoppingItem[] {
  const merged = new Map<string, { name: string; amounts: string[] }>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    const entry = merged.get(key);
    if (entry) entry.amounts.push(item.amount);
    else merged.set(key, { name: item.name.trim(), amounts: [item.amount] });
  }

  const db = getDatabase();
  const toInsert: NewShoppingItem[] = [];

  db.transaction(() => {
    const existing = db
      .prepare('SELECT id, name, amount FROM shopping_list_items WHERE checked = 0 ORDER BY id ASC')
      .all() as { id: number; name: string; amount: string }[];
    const update = db.prepare("UPDATE shopping_list_items SET amount = ?, updated_at = datetime('now') WHERE id = ?");

    for (const [key, { name, amounts }] of merged) {
      const numbers = amounts.map(parseAmount);
      const allNumeric = numbers.every((n): n is number => n !== null);
      const useComma = amounts.some(a => a.includes(','));

      const match = allNumeric
        ? existing.find(e => e.name.trim().toLowerCase() === key && parseAmount(e.amount) !== null)
        : undefined;

      if (match) {
        const total = (numbers as number[]).reduce((a, b) => a + b, parseAmount(match.amount)!);
        update.run(formatAmount(total, useComma || match.amount.includes(',')), match.id);
      } else {
        const amount = allNumeric
          ? formatAmount((numbers as number[]).reduce((a, b) => a + b, 0), useComma)
          : amounts.join(' + ');
        toInsert.push({ name, amount, category_id: null });
      }
    }
  })();

  return addItems(toInsert);
}

// ==================== Kategorien ====================

export function getAllCategories(): ShoppingCategory[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM shopping_categories ORDER BY sort_order ASC, id ASC').all() as ShoppingCategory[];
}

export function getCategoryById(id: number): ShoppingCategory | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM shopping_categories WHERE id = ?').get(id) as ShoppingCategory | undefined;
}

export function addCategory(name: string): ShoppingCategory {
  const db = getDatabase();
  const maxSort = (db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS mx FROM shopping_categories').get() as { mx: number }).mx;
  const result = db.prepare('INSERT INTO shopping_categories (name, sort_order) VALUES (?, ?)').run(name, maxSort + 1);
  return getCategoryById(Number(result.lastInsertRowid))!;
}

export function renameCategory(id: number, name: string): ShoppingCategory | undefined {
  const db = getDatabase();
  if (!getCategoryById(id)) return undefined;
  db.prepare('UPDATE shopping_categories SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, id);
  return getCategoryById(id);
}

// Löscht eine Kategorie inkl. aller enthaltenen Items.
// Die letzte verbleibende Kategorie darf nicht gelöscht werden.
export function deleteCategory(id: number): { deleted: boolean; itemsDeleted: number } {
  const db = getDatabase();
  const count = db.prepare('SELECT COUNT(*) AS c FROM shopping_categories').get() as { c: number };
  if (count.c <= 1) {
    return { deleted: false, itemsDeleted: 0 };
  }

  return db.transaction(() => {
    const itemsDeleted = db.prepare('DELETE FROM shopping_list_items WHERE category_id = ?').run(id).changes;
    const result = db.prepare('DELETE FROM shopping_categories WHERE id = ?').run(id);
    return { deleted: result.changes > 0, itemsDeleted };
  })();
}

// ==================== Vorlagen ====================

function hydrateTemplates(templates: ShoppingTemplateRow[]): ShoppingTemplate[] {
  if (templates.length === 0) return [];

  const rows = getDatabase()
    .prepare('SELECT * FROM shopping_template_items ORDER BY sort_order ASC, id ASC')
    .all() as ShoppingTemplateItemRow[];

  const byTemplate = new Map<number, ShoppingTemplateItem[]>();
  for (const row of rows) {
    const list = byTemplate.get(row.template_id) ?? [];
    list.push({
      id: row.id,
      template_id: row.template_id,
      name: row.name,
      amount: row.amount,
      sort_order: row.sort_order,
    });
    byTemplate.set(row.template_id, list);
  }

  return templates.map(template => ({ ...template, items: byTemplate.get(template.id) ?? [] }));
}

function replaceTemplateItems(templateId: number, items: ShoppingTemplateItem[]): void {
  const db = getDatabase();
  db.prepare('DELETE FROM shopping_template_items WHERE template_id = ?').run(templateId);
  const insert = db.prepare(
    'INSERT INTO shopping_template_items (template_id, name, amount, sort_order) VALUES (?, ?, ?, ?)'
  );
  for (const item of items) {
    insert.run(templateId, item.name, item.amount, item.sort_order);
  }
}

export function getAllTemplates(): ShoppingTemplate[] {
  const templates = getDatabase()
    .prepare('SELECT * FROM shopping_templates ORDER BY name ASC')
    .all() as ShoppingTemplateRow[];
  return hydrateTemplates(templates);
}

export function getTemplateById(id: number): ShoppingTemplate | undefined {
  const template = getDatabase()
    .prepare('SELECT * FROM shopping_templates WHERE id = ?')
    .get(id) as ShoppingTemplateRow | undefined;
  return template ? hydrateTemplates([template])[0] : undefined;
}

export function createTemplate(name: string, items: ShoppingTemplateItem[]): ShoppingTemplate {
  const db = getDatabase();
  const create = db.transaction((): number => {
    const result = db.prepare('INSERT INTO shopping_templates (name) VALUES (?)').run(name);
    const id = Number(result.lastInsertRowid);
    replaceTemplateItems(id, items);
    return id;
  });
  return getTemplateById(create())!;
}

export function updateTemplate(id: number, name: string, items: ShoppingTemplateItem[]): ShoppingTemplate | undefined {
  const db = getDatabase();
  const update = db.transaction((): boolean => {
    const result = db
      .prepare("UPDATE shopping_templates SET name = ?, updated_at = datetime('now') WHERE id = ?")
      .run(name, id);
    if (result.changes === 0) return false;
    replaceTemplateItems(id, items);
    return true;
  });
  return update() ? getTemplateById(id) : undefined;
}

export function deleteTemplate(id: number): boolean {
  return getDatabase().prepare('DELETE FROM shopping_templates WHERE id = ?').run(id).changes > 0;
}

/** Fügt die Items einer Vorlage der Einkaufsliste hinzu; leeres Array, wenn die Vorlage fehlt. */
export function applyTemplate(templateId: number): ShoppingItem[] {
  const template = getTemplateById(templateId);
  if (!template) return [];

  return addItems(template.items.map(item => ({ name: item.name, amount: item.amount })));
}
