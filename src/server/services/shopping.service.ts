import { getDatabase } from '../database';

export interface ShoppingItem {
  id?: number;
  name: string;
  amount: string;
  checked?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ShoppingItemRow {
  id: number;
  name: string;
  amount: string;
  checked: number;
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
  return db.prepare('SELECT * FROM shopping_list_items ORDER BY id ASC').all() as ShoppingItem[];
}

export function addItem(name: string, amount: string): ShoppingItem {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO shopping_list_items (name, amount) VALUES (?, ?)').run(name, amount);
  const id = result.lastInsertRowid as number;
  return getItemById(id)!;
}

export function addItems(items: { name: string; amount: string }[]): ShoppingItem[] {
  const db = getDatabase();
  const insert = db.prepare('INSERT INTO shopping_list_items (name, amount) VALUES (?, ?)');
  const insertMany = db.transaction((itemsToInsert: { name: string; amount: string }[]) => {
    for (const item of itemsToInsert) {
      insert.run(item.name, item.amount);
    }
  });
  insertMany(items);
  return getAllItems();
}

export function getItemById(id: number): ShoppingItem | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM shopping_list_items WHERE id = ?').get(id) as ShoppingItem | undefined;
}

export function updateItem(id: number, name: string, amount: string, checked: number): ShoppingItem | undefined {
  const db = getDatabase();
  const existing = getItemById(id);
  if (!existing) return undefined;

  db.prepare(
    'UPDATE shopping_list_items SET name = ?, amount = ?, checked = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(name, amount, checked, id);

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
  }));

  return addItems(finalItems);
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