/**
 * Einkaufsliste (Standardansicht): Kategorien, Artikel, Abhaken und
 * Synchronisierung per Polling, solange der Tab sichtbar ist.
 */
import { shoppingApi } from './api.js';
import { groupShoppingItems, sameList, sortShoppingItems } from './domain.js';
import {
  bindClose, byId, closeModal, confirmDialog, el, hide, icon, openModal, render, setVisible,
  showError, showToast,
} from './dom.js';
import { readJson, writeJson } from './storage.js';

const POLL_INTERVAL_MS = 3000;
const COLLAPSED_KEY = 'mampf.collapsedCategories';
const ITEM_FIELDS = ['id', 'name', 'amount', 'checked', 'category_id'];
const CATEGORY_FIELDS = ['id', 'name'];

let items = [];
let categories = [];
let collapsed = readJson(COLLAPSED_KEY, {}); // Schlüssel: Kategorie-ID bzw. "null" für „Allgemein“
let openMenuId = null;
let renamingId = null;
let focusItemId = null;
let pollTimer = null;
const pendingWrites = new Set(); // laufende Speichervorgänge – ein Refresh wartet darauf, damit er sie nicht überholt

export const getShoppingItems = () => items;

// ==================== Synchronisierung ====================

function setSyncState(state) {
  const indicator = byId('sync-indicator');
  indicator.classList.toggle('syncing', state === 'syncing');
  indicator.classList.toggle('error', state === 'error');
  indicator.title = { syncing: 'Synchronisiere …', error: 'Verbindungsproblem', ok: 'Synchronisiert' }[state];
}

const isEditing = () => {
  const active = document.activeElement;
  return byId('shopping-categories').contains(active) && active.matches('input');
};

/** Lädt Artikel und Kategorien neu und rendert, wenn sich etwas geändert hat. */
export async function refreshShopping({ force = true } = {}) {
  try {
    if (force) setSyncState('syncing');
    await Promise.allSettled([...pendingWrites]);
    const [nextItems, nextCategories] = await Promise.all([shoppingApi.listItems(), shoppingApi.listCategories()]);
    const changed = !sameList(items, nextItems, ITEM_FIELDS) || !sameList(categories, nextCategories, CATEGORY_FIELDS);
    if (force || (changed && !isEditing())) {
      items = nextItems;
      categories = nextCategories;
      renderShopping();
    }
    setSyncState('ok');
  } catch (err) {
    setSyncState('error');
    if (force && err.status !== 401) showToast(`Fehler beim Laden der Einkaufsliste: ${err.message}`, 'error');
  }
}

/** Startet bzw. stoppt das Polling (aktiv, solange der Einkaufslisten-Tab offen ist). */
export function setShoppingActive(active) {
  clearInterval(pollTimer);
  pollTimer = null;
  if (!active) return;
  refreshShopping();
  pollTimer = setInterval(() => {
    if (!document.hidden) refreshShopping({ force: false });
  }, POLL_INTERVAL_MS);
}

// ==================== Darstellung ====================

const collapseKey = (category) => String(category?.id ?? 'null');

function renderShopping() {
  const container = byId('shopping-categories');
  const isEmpty = items.length === 0 && categories.length === 0;
  setVisible(byId('no-shopping-items'), isEmpty);
  render(container, isEmpty ? [] : groupShoppingItems(items, categories).map(categorySection));

  if (focusItemId !== null) {
    container.querySelector(`[data-item-id="${focusItemId}"] .shopping-name-input`)?.focus();
    focusItemId = null;
  }
  container.querySelector('.cat-rename-input')?.select();
}

function categorySection({ category, items: groupItems }) {
  const isCollapsed = collapsed[collapseKey(category)] === true;
  return el('section', { class: 'shopping-category' },
    categoryHeader(category, isCollapsed, groupItems.length),
    !isCollapsed && el('div', { class: 'shopping-category-body' },
      sortShoppingItems(groupItems).map(itemRow),
      el('button', { type: 'button', class: 'btn btn-secondary btn-small cat-add-item-btn', onclick: () => addItem(category?.id ?? null) },
        icon('add'), 'Zeile hinzufügen')));
}

function categoryHeader(category, isCollapsed, count) {
  const key = collapseKey(category);
  const isRenaming = category && renamingId === category.id;

  const title = isRenaming
    ? renameInput(category)
    : el('button', {
      type: 'button', class: 'cat-toggle', 'aria-expanded': String(!isCollapsed),
      onclick: () => {
        collapsed = { ...collapsed, [key]: !isCollapsed };
        writeJson(COLLAPSED_KEY, collapsed);
        openMenuId = null;
        renderShopping();
      },
    },
    icon(isCollapsed ? 'chevron-forward' : 'chevron-down'),
    el('span', { class: 'cat-name' }, category?.name ?? 'Allgemein'),
    el('span', { class: 'cat-count' }, String(count)));

  return el('header', { class: 'shopping-category-header' },
    title,
    category && !isRenaming && el('div', { class: 'cat-menu-wrap' },
      el('button', {
        type: 'button', class: 'cat-menu-btn', title: 'Optionen', 'aria-label': `Optionen für ${category.name}`,
        'aria-haspopup': 'menu', 'aria-expanded': String(openMenuId === category.id),
        onclick: () => {
          openMenuId = openMenuId === category.id ? null : category.id;
          renderShopping();
        },
      }, icon('ellipsis-vertical')),
      openMenuId === category.id && categoryMenu(category)));
}

function categoryMenu(category) {
  return el('div', { class: 'cat-menu', role: 'menu' },
    el('button', {
      type: 'button', role: 'menuitem', class: 'cat-menu-action',
      onclick: () => {
        openMenuId = null;
        renamingId = category.id;
        renderShopping();
      },
    }, 'Umbenennen'),
    el('button', {
      type: 'button', role: 'menuitem', class: 'cat-menu-action cat-menu-danger', disabled: categories.length <= 1,
      title: categories.length <= 1 ? 'Die letzte Kategorie kann nicht gelöscht werden.' : undefined,
      onclick: () => {
        openMenuId = null;
        renderShopping();
        deleteCategory(category);
      },
    }, 'Löschen'));
}

function renameInput(category) {
  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    renamingId = null;
    const value = input.value.trim();
    if (save && value && value !== category.name) saveRename(category, value);
    else renderShopping();
  };
  const input = el('input', {
    type: 'text', class: 'cat-rename-input', maxLength: 100, value: category.name, 'aria-label': 'Kategoriename',
    onblur: () => finish(true),
    onkeydown: (event) => {
      if (event.key === 'Enter') finish(true);
      else if (event.key === 'Escape') finish(false);
    },
  });
  queueMicrotask(() => input.focus());
  return input;
}

function itemRow(item) {
  return el('div', { class: `shopping-item${item.checked ? ' checked' : ''}`, dataset: { itemId: item.id } },
    el('input', {
      type: 'checkbox', class: 'shopping-checkbox', checked: Boolean(item.checked), 'aria-label': 'Erledigt',
      onchange: (event) => toggleChecked(item, event.target.checked),
    }),
    el('input', {
      type: 'text', class: 'shopping-input shopping-name-input', value: item.name, placeholder: 'Artikel',
      'aria-label': 'Artikel', enterkeyhint: 'done', onchange: (event) => saveField(item, 'name', event.target),
      onkeydown: blurOnEnter,
    }),
    el('input', {
      type: 'text', class: 'shopping-input shopping-amount-input', value: item.amount, placeholder: 'Menge',
      'aria-label': 'Menge', enterkeyhint: 'done', onchange: (event) => saveField(item, 'amount', event.target),
      onkeydown: blurOnEnter,
    }),
    el('button', {
      type: 'button', class: 'btn-icon btn-icon-delete', title: 'Löschen', 'aria-label': `${item.name || 'Zeile'} löschen`,
      onclick: () => removeItem(item.id),
    }, icon('trash')));
}

const blurOnEnter = (event) => {
  if (event.key === 'Enter') event.target.blur();
};

// ==================== Artikel ====================

/** Führt einen Schreibzugriff aus und merkt ihn für `refreshShopping` vor. */
function trackWrite(promise) {
  pendingWrites.add(promise);
  return promise.finally(() => pendingWrites.delete(promise));
}

const payload = (item, overrides = {}) => ({ name: item.name, amount: item.amount, checked: item.checked ? 1 : 0, ...overrides });

async function toggleChecked(item, checked) {
  item.checked = checked ? 1 : 0; // optimistisch
  renderShopping();
  try {
    await trackWrite(shoppingApi.updateItem(item.id, payload(item)));
  } catch (err) {
    item.checked = checked ? 0 : 1;
    renderShopping();
    showToast(`Fehler beim Aktualisieren: ${err.message}`, 'error');
  }
}

async function saveField(item, field, input) {
  let value = input.value.trim();
  if (field === 'name' && !value) return; // leere Zeilen bleiben bewusst stehen
  if (field === 'amount' && !value) value = '1';
  if (value === item[field]) return;

  const previous = item[field];
  item[field] = value;
  try {
    await trackWrite(shoppingApi.updateItem(item.id, payload(item)));
  } catch (err) {
    item[field] = previous;
    showToast(`Fehler beim Speichern: ${err.message}`, 'error');
    await refreshShopping();
  }
}

async function addItem(categoryId) {
  try {
    const created = await shoppingApi.addItem('', '1', categoryId);
    focusItemId = created.id;
    await refreshShopping();
  } catch (err) {
    showToast(`Fehler beim Hinzufügen: ${err.message}`, 'error');
  }
}

async function removeItem(id) {
  try {
    await shoppingApi.removeItem(id);
    await refreshShopping();
  } catch (err) {
    showToast(`Fehler beim Löschen: ${err.message}`, 'error');
  }
}

async function clearChecked() {
  try {
    const { deleted } = await shoppingApi.clearChecked();
    showToast(deleted > 0 ? `${deleted} Artikel gelöscht.` : 'Keine abgehakten Artikel vorhanden.', deleted > 0 ? 'success' : 'error');
    await refreshShopping();
  } catch (err) {
    showToast(`Fehler beim Löschen: ${err.message}`, 'error');
  }
}

// ==================== Kategorien ====================

async function saveRename(category, name) {
  try {
    await shoppingApi.renameCategory(category.id, name);
    showToast('Kategorie umbenannt.', 'success');
  } catch (err) {
    showToast(`Fehler beim Umbenennen: ${err.message}`, 'error');
  }
  await refreshShopping();
}

async function addCategory(name) {
  const errorBox = byId('add-category-error');
  try {
    await shoppingApi.addCategory(name);
    closeModal('add-category-modal');
    showToast('Kategorie hinzugefügt.', 'success');
    await refreshShopping();
  } catch (err) {
    showError(errorBox, err.message || 'Fehler beim Hinzufügen.');
  }
}

async function deleteCategory(category) {
  const confirmed = await confirmDialog({
    title: 'Kategorie löschen',
    body: [
      el('p', {}, 'Möchtest du die Kategorie ', el('strong', {}, category.name), ' wirklich löschen?'),
      el('p', {}, 'Alle enthaltenen Artikel werden ebenfalls gelöscht.'),
      el('p', { class: 'warning' }, 'Diese Aktion kann nicht rückgängig gemacht werden.'),
    ],
    confirmLabel: 'Löschen',
    confirmIcon: 'trash',
    danger: true,
  });
  if (!confirmed) return;

  try {
    const { deleted } = await shoppingApi.removeCategory(category.id);
    showToast(deleted > 0 ? `Kategorie gelöscht (${deleted} Artikel entfernt).` : 'Kategorie gelöscht.', 'success');
  } catch (err) {
    showToast(`Fehler beim Löschen: ${err.message}`, 'error');
  }
  await refreshShopping();
}

// ==================== Init ====================

export function initShopping() {
  byId('clear-checked-btn').addEventListener('click', clearChecked);

  byId('add-category-btn').addEventListener('click', () => {
    byId('add-category-form').reset();
    hide(byId('add-category-error'));
    openModal('add-category-modal');
  });
  bindClose('cancel-add-category-btn', 'add-category-modal');
  byId('add-category-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = byId('new-category-name').value.trim();
    if (name) addCategory(name);
    else showError(byId('add-category-error'), 'Name ist erforderlich.');
  });

  // Kategorie-Menü schließt bei Klick außerhalb.
  document.addEventListener('click', (event) => {
    if (openMenuId !== null && !event.target.closest('.cat-menu-wrap')) {
      openMenuId = null;
      renderShopping();
    }
  });

  // Beim Zurückkehren in die App sofort synchronisieren.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && pollTimer) refreshShopping({ force: false });
  });
}
