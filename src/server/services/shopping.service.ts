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

// Stellt sicher, dass mindestens eine Kategorie existiert.
export function ensureDefaultCategory(): ShoppingCategory {
  const db = getDatabase();
  const category = db.prepare('SELECT * FROM shopping_categories ORDER BY sort_order ASC, id ASC LIMIT 1').get() as ShoppingCategory | undefined;
  if (!category) {
    const result = db.prepare('INSERT INTO shopping_categories (name, sort_order) VALUES (?, 0)').run('Allgemein');
    return getCategoryById(result.lastInsertRowid as number)!;
  }
  return category;
}

export function getDefaultCategoryId(): number {
  return ensureDefaultCategory().id as number;
}

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
  const db = getDatabase();
  const catId = categoryId !== undefined ? categoryId : null;
  const result = db.prepare('INSERT INTO shopping_list_items (name, amount, category_id) VALUES (?, ?, ?)').run(name, amount, catId);
  const id = result.lastInsertRowid as number;
  return getItemById(id)!;
}

export function addItems(items: { name: string; amount: string; category_id?: number | null }[]): ShoppingItem[] {
  const db = getDatabase();
  const insert = db.prepare('INSERT INTO shopping_list_items (name, amount, category_id) VALUES (?, ?, ?)');
  const insertMany = db.transaction((itemsToInsert: { name: string; amount: string; category_id?: number | null }[]) => {
    for (const item of itemsToInsert) {
      const catId = item.category_id !== undefined ? item.category_id : null;
      insert.run(item.name, item.amount, catId);
    }
  });
  insertMany(items);
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
  const existing = getItemById(id);
  if (!existing) return undefined;

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

export function addItemsFromMeals(items: { name: string; amount: string }[]): ShoppingItem[] {
  // Deduplizieren: Gleiche Namen zusammenfassen
  const merged = new Map<string, string>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    if (merged.has(key)) {
      merged.set(key, merged.get(key)! + ' + ' + item.amount);
    } else {
      merged.set(key, item.amount);
    }
  }

  const finalItems = Array.from(merged.entries()).map(([name, amount]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    amount,
    category_id: null,
  }));

  return addItems(finalItems);
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
  return getCategoryById(result.lastInsertRowid as number)!;
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

  const itemsDeleted = (db.prepare('DELETE FROM shopping_list_items WHERE category_id = ?').run(id)).changes;
  const result = db.prepare('DELETE FROM shopping_categories WHERE id = ?').run(id);
  return { deleted: result.changes > 0, itemsDeleted };
}

// ==================== Vorlagen ====================

export function getAllTemplates(): ShoppingTemplate[] {
  const db = getDatabase();
  const templates = db.prepare('SELECT * FROM shopping_templates ORDER BY name ASC').all() as ShoppingTemplateRow[];
  const items = db.prepare('SELECT * FROM shopping_template_items ORDER BY sort_order ASC').all() as ShoppingTemplateItemRow[];

  return templates.map(template => ({
    ...template,
    items: items
      .filter(item => item.template_id === template.id)
      .map(item => ({
        id: item.id,
        template_id: item.template_id,
        name: item.name,
        amount: item.amount,
        sort_order: item.sort_order,
      })),
  }));
}

export function getTemplateById(id: number): ShoppingTemplate | undefined {
  const db = getDatabase();
  const template = db.prepare('SELECT * FROM shopping_templates WHERE id = ?').get(id) as ShoppingTemplateRow | undefined;
  if (!template) return undefined;

  const items = db.prepare('SELECT * FROM shopping_template_items WHERE template_id = ? ORDER BY sort_order ASC').all(id) as ShoppingTemplateItemRow[];

  return {
    ...template,
    items: items.map(item => ({
      id: item.id,
      template_id: item.template_id,
      name: item.name,
      amount: item.amount,
      sort_order: item.sort_order,
    })),
  };
}

export function createTemplate(name: string, items: ShoppingTemplateItem[]): ShoppingTemplate {
  const db = getDatabase();

  const result = db.prepare('INSERT INTO shopping_templates (name) VALUES (?)').run(name);
  const templateId = result.lastInsertRowid as number;

  const insertItem = db.prepare(
    'INSERT INTO shopping_template_items (template_id, name, amount, sort_order) VALUES (?, ?, ?, ?)'
  );

  const insertMany = db.transaction((itemsToInsert: ShoppingTemplateItem[]) => {
    for (const item of itemsToInsert) {
      insertItem.run(templateId, item.name, item.amount, item.sort_order);
    }
  });

  insertMany(items);

  return getTemplateById(templateId)!;
}

export function updateTemplate(id: number, name: string, items: ShoppingTemplateItem[]): ShoppingTemplate | undefined {
  const db = getDatabase();
  const existing = getTemplateById(id);
  if (!existing) return undefined;

  db.prepare('UPDATE shopping_templates SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, id);

  // Items löschen und neu einfügen
  db.prepare('DELETE FROM shopping_template_items WHERE template_id = ?').run(id);

  const insertItem = db.prepare(
    'INSERT INTO shopping_template_items (template_id, name, amount, sort_order) VALUES (?, ?, ?, ?)'
  );

  const insertMany = db.transaction((itemsToInsert: ShoppingTemplateItem[]) => {
    for (const item of itemsToInsert) {
      insertItem.run(id, item.name, item.amount, item.sort_order);
    }
  });

  insertMany(items);

  return getTemplateById(id);
}

export function deleteTemplate(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM shopping_templates WHERE id = ?').run(id);
  return result.changes > 0;
}

export function applyTemplate(templateId: number): ShoppingItem[] {
  const template = getTemplateById(templateId);
  if (!template) return [];

  const items = template.items.map(item => ({
    name: item.name,
    amount: item.amount,
  }));

  return addItems(items);
}