import { Body, ValidationResult, asBody, isNonEmptyString, normalizeAmount, toCategoryId } from './common';

export interface ListItemInput {
  name: string;
  amount: string;
}

export interface BulkItemInput extends ListItemInput {
  category_id: number | null;
}

export interface TemplateItemInput extends ListItemInput {
  sort_order: number;
}

export interface TemplateInput {
  name: string;
  items: TemplateItemInput[];
}

/** Behält nur Einträge mit nicht-leerem Namen und normalisiert die Menge. */
function validItems(raw: unknown[]): ListItemInput[] {
  return raw
    .map(asBody)
    .filter(item => isNonEmptyString(item.name))
    .map(item => ({
      name: (item.name as string).trim(),
      amount: normalizeAmount(item.amount),
    }));
}

export function validateBulkItems(raw: unknown[]): BulkItemInput[] {
  return raw
    .map(asBody)
    .filter(item => isNonEmptyString(item.name))
    .map(item => ({
      name: (item.name as string).trim(),
      amount: normalizeAmount(item.amount),
      category_id: toCategoryId(item.category_id),
    }));
}

export function validateItemList(raw: unknown): ListItemInput[] {
  return Array.isArray(raw) ? validItems(raw) : [];
}

export function validateTemplateInput(raw: unknown): ValidationResult<TemplateInput> {
  const body: Body = asBody(raw);

  if (!isNonEmptyString(body.name)) {
    return { ok: false, errors: ['Name ist erforderlich.'] };
  }

  const items = validateItemList(body.items);
  if (!Array.isArray(body.items) || body.items.length === 0 || items.length === 0) {
    return { ok: false, errors: ['Mindestens ein Item ist erforderlich.'] };
  }

  return {
    ok: true,
    value: {
      name: body.name.trim(),
      items: items.map((item, index) => ({ ...item, sort_order: index })),
    },
  };
}

/** Name einer Kategorie; liefert null bei ungültigem Wert. */
export function validateName(raw: unknown): string | null {
  const name = asBody(raw).name;
  return isNonEmptyString(name) ? name.trim() : null;
}
