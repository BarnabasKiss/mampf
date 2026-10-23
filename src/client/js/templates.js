/**
 * Einkaufslisten-Vorlagen: speichern, verwalten, bearbeiten, anwenden.
 */
import { shoppingApi } from './api.js';
import {
  bindClose, byId, closeModal, confirmDialog, el, hide, icon, openModal, render, showError, showToast,
} from './dom.js';
import { getShoppingItems, refreshShopping } from './shopping.js';

let templates = [];
let editingTemplateId = null;

async function loadTemplates() {
  try {
    templates = await shoppingApi.listTemplates();
    renderTemplates();
  } catch (err) {
    showToast(`Fehler beim Laden der Vorlagen: ${err.message}`, 'error');
  }
}

function renderTemplates() {
  const list = byId('templates-list');
  if (templates.length === 0) {
    render(list, el('p', { class: 'empty-hint' }, 'Noch keine Vorlagen vorhanden.'));
    return;
  }

  render(list, templates.map((template) =>
    el('div', { class: 'template-item' },
      el('div', { class: 'template-info' },
        el('span', { class: 'template-name' }, template.name),
        el('span', { class: 'template-meta' }, `${template.items.length} Artikel`)),
      el('div', { class: 'template-actions' },
        el('button', { type: 'button', class: 'btn btn-primary btn-small', title: 'Zur Einkaufsliste hinzufügen', 'aria-label': 'Zur Einkaufsliste hinzufügen', onclick: () => applyTemplate(template) }, icon('download')),
        el('button', { type: 'button', class: 'btn btn-secondary btn-small', title: 'Bearbeiten', 'aria-label': 'Bearbeiten', onclick: () => openTemplateForm(template) }, icon('create')),
        el('button', { type: 'button', class: 'btn btn-danger btn-small', title: 'Löschen', 'aria-label': 'Löschen', onclick: () => deleteTemplate(template) }, icon('trash'))))));
}

async function applyTemplate(template) {
  try {
    await shoppingApi.applyTemplate(template.id);
    closeModal('manage-templates-modal');
    showToast('Vorlage hinzugefügt.', 'success');
    await refreshShopping();
  } catch (err) {
    showToast(`Fehler beim Anwenden der Vorlage: ${err.message}`, 'error');
  }
}

async function deleteTemplate(template) {
  const confirmed = await confirmDialog({
    title: 'Vorlage löschen',
    body: [
      el('p', {}, 'Möchtest du die Vorlage ', el('strong', {}, template.name), ' wirklich löschen?'),
      el('p', { class: 'warning' }, 'Diese Aktion kann nicht rückgängig gemacht werden.'),
    ],
    confirmLabel: 'Löschen',
    confirmIcon: 'trash',
    danger: true,
  });
  if (!confirmed) return;

  try {
    await shoppingApi.removeTemplate(template.id);
    showToast('Vorlage gelöscht.', 'success');
    await loadTemplates();
  } catch (err) {
    showToast(`Fehler beim Löschen der Vorlage: ${err.message}`, 'error');
  }
}

// ==================== Aktuelle Liste als Vorlage speichern ====================

function openSaveTemplate() {
  if (getShoppingItems().length === 0) {
    showToast('Die Einkaufsliste ist leer – nichts zu speichern.', 'error');
    return;
  }
  byId('save-template-form').reset();
  hide(byId('save-template-error'));
  openModal('save-template-modal');
}

async function saveListAsTemplate(event) {
  event.preventDefault();
  const errorBox = byId('save-template-error');
  const name = byId('template-name').value.trim();
  if (!name) {
    showError(errorBox, 'Name ist erforderlich.');
    return;
  }
  try {
    await shoppingApi.createTemplate(name, getShoppingItems().map(({ name: itemName, amount }) => ({ name: itemName, amount })));
    closeModal('save-template-modal');
    showToast('Vorlage gespeichert.', 'success');
    await loadTemplates();
  } catch (err) {
    showError(errorBox, err.message || 'Fehler beim Speichern der Vorlage.');
  }
}

// ==================== Vorlagen-Formular ====================

function addTemplateItemRow(name = '', amount = '1') {
  const list = byId('template-items-list');
  const row = el('div', { class: 'ingredient-row' },
    el('input', { type: 'text', class: 'template-item-name', placeholder: 'Artikel', 'aria-label': 'Artikel', value: name }),
    el('input', { type: 'text', class: 'template-item-amount', placeholder: 'Menge', 'aria-label': 'Menge', value: amount }),
    el('button', {
      type: 'button', class: 'btn-remove-row', title: 'Artikel entfernen', 'aria-label': 'Artikel entfernen',
      onclick: () => {
        if (list.children.length > 1) row.remove();
        else showToast('Mindestens ein Artikel ist erforderlich.', 'error');
      },
    }, icon('close')));
  list.append(row);
}

function readTemplateItems() {
  return [...byId('template-items-list').querySelectorAll('.ingredient-row')].map((row, sort_order) => ({
    name: row.querySelector('.template-item-name').value.trim(),
    amount: row.querySelector('.template-item-amount').value.trim() || '1',
    sort_order,
  }));
}

function openTemplateForm(template) {
  editingTemplateId = template?.id ?? null;
  closeModal('manage-templates-modal');
  byId('template-form-title').textContent = template ? 'Vorlage bearbeiten' : 'Neue Vorlage';
  byId('template-form-name').value = template?.name ?? '';
  hide(byId('template-form-error'));

  byId('template-items-list').replaceChildren();
  (template?.items ?? [{ name: '', amount: '1' }]).forEach((item) => addTemplateItemRow(item.name, item.amount));
  openModal('template-form-modal');
}

async function submitTemplateForm(event) {
  event.preventDefault();
  const errorBox = byId('template-form-error');
  hide(errorBox);

  const name = byId('template-form-name').value.trim();
  const items = readTemplateItems();
  const errors = [];
  if (!name) errors.push('Name ist erforderlich.');
  items.forEach((item, i) => {
    if (!item.name) errors.push(`Artikel ${i + 1}: Name ist erforderlich.`);
  });
  if (errors.length > 0) {
    showError(errorBox, errors);
    return;
  }

  try {
    if (editingTemplateId) {
      await shoppingApi.updateTemplate(editingTemplateId, name, items);
      showToast('Vorlage aktualisiert.', 'success');
    } else {
      await shoppingApi.createTemplate(name, items);
      showToast('Vorlage erstellt.', 'success');
    }
    closeModal('template-form-modal');
    await loadTemplates();
    openModal('manage-templates-modal');
  } catch (err) {
    showError(errorBox, err.message || 'Fehler beim Speichern.');
  }
}

export function initTemplates() {
  byId('save-as-template-btn').addEventListener('click', openSaveTemplate);
  byId('save-template-form').addEventListener('submit', saveListAsTemplate);
  bindClose('cancel-save-template-btn', 'save-template-modal');

  byId('manage-templates-btn').addEventListener('click', async () => {
    await loadTemplates();
    openModal('manage-templates-modal');
  });
  bindClose('close-manage-templates-btn', 'manage-templates-modal');
  byId('add-template-btn').addEventListener('click', () => openTemplateForm(null));

  byId('add-template-item-btn').addEventListener('click', () => addTemplateItemRow());
  byId('template-form').addEventListener('submit', submitTemplateForm);
  byId('cancel-template-form-btn').addEventListener('click', () => {
    closeModal('template-form-modal');
    openModal('manage-templates-modal');
  });
}
