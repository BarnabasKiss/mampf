export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export type Body = Record<string, unknown>;

export function asBody(value: unknown): Body {
  return typeof value === 'object' && value !== null ? (value as Body) : {};
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Menge als getrimmter String; leer/fehlend ergibt "1". */
export function normalizeAmount(value: unknown): string {
  if (value === undefined || value === null) return '1';
  const text = String(value).trim();
  return text === '' ? '1' : text;
}

/** Ganzzahlige Kategorie-ID oder null. */
export function toCategoryId(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
