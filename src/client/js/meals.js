/**
 * Gerichte: Liste, Suche, Formular, Duplizieren, Löschen.
 *
 * Nach jeder Änderung wird `meals:changed` auf `document` ausgelöst,
 * damit der Wochenplan seine Daten beim nächsten Anzeigen abgleicht.
 */
import { mealsApi } from './api.js';
import { DIFFICULTIES, filterAndSortMeals, ingredientsPreview } from './domain.js';
import {
  bindClose, byId, closeModal, confirmDialog, debounce, el, hide, icon, openModal, render,
  setVisible, showError, showToast,
} from './dom.js';

let meals = [];
let searchTerm = '';
let difficultyFilter = 0;
let sortMode = 'name';
let editingMealId = null;

export function difficultyBadge(difficulty) {
  const level = DIFFICULTIES.find((d) => d.value === difficulty) ?? DIFFICULTIES[0];
  const dots = [1, 2, 3].map((i) => (i <= difficulty ? '●' : '○')).join('');
  return el('span', { class: `difficulty-badge ${level.css}` }, el('span', { class: 'dots', 'aria-hidden': 'true' }, dots), ' ', level.label);
}

function notifyChanged() {
  document.dispatchEvent(new CustomEvent('meals:changed'));
}

export async function loadMeals() {
  try {
    meals = await mealsApi.list(searchTerm);
    renderMeals();
  } catch (err) {
    showToast(`Fehler beim Laden der Gerichte: ${err.message}`, 'error');
  }
}

function iconButton(kind, title, iconName, onClick) {
  return el('button', { class: `btn-icon btn-icon-${kind}`, type: 'button', title, 'aria-label': title, onclick: onClick }, icon(iconName));
}

function renderMeals() {
  const visibleMeals = filterAndSortMeals(meals, { difficulty: difficultyFilter, sort: sortMode });
  const grid = byId('meals-grid');
  setVisible(grid, visibleMeals.length > 0);
  setVisible(byId('no-meals'), visibleMeals.length === 0);
  const filtered = searchTerm || difficultyFilter;
  byId('no-meals-text').textContent = filtered ? 'Keine passenden Gerichte gefunden.' : 'Noch keine Gerichte vorhanden. Füge dein erstes Gericht hinzu!';

  render(grid, visibleMeals.map((meal) =>
    el('article', { class: 'meal-card' },
      el('div', { class: 'meal-card-header' },
        el('h3', {}, meal.name),
        difficultyBadge(meal.difficulty)),
      el('div', { class: 'meal-card-meta' }, `${meal.standard_portions} Portionen · ${meal.ingredients.length} Zutaten`),
      el('p', { class: 'meal-card-ingredients' }, ingredientsPreview(meal.ingredients)),
      el('div', { class: 'meal-card-actions' },
        iconButton('edit', 'Bearbeiten', 'create', () => openMealForm(meal)),
        iconButton('duplicate', 'Duplizieren', 'copy', () => duplicateMeal(meal)),
        iconButton('delete', 'Löschen', 'trash', () => deleteMeal(meal))))));
}

async function duplicateMeal(meal) {
  try {
    await mealsApi.create({
      name: `${meal.name} (Kopie)`,
      difficulty: meal.difficulty,
      standard_portions: meal.standard_portions,
      ingredients: meal.ingredients.map(({ name, package_count }, sort_order) => ({ name, package_count, sort_order })),
    });
    showToast('Gericht dupliziert.', 'success');
    await loadMeals();
    notifyChanged();
  } catch (err) {
    showToast(`Fehler beim Duplizieren: ${err.message}`, 'error');
  }
}

async function deleteMeal(meal) {
  const confirmed = await confirmDialog({
    title: 'Gericht löschen',
    body: [
      el('p', {}, 'Möchtest du das Gericht ', el('strong', {}, meal.name), ' wirklich löschen?'),
      el('p', { class: 'warning' }, 'Diese Aktion kann nicht rückgängig gemacht werden.'),
    ],
    confirmLabel: 'Löschen',
    confirmIcon: 'trash',
    danger: true,
  });
  if (!confirmed) return;

  try {
    await mealsApi.remove(meal.id);
    showToast('Gericht gelöscht.', 'success');
    await loadMeals();
    notifyChanged();
  } catch (err) {
    showToast(`Fehler beim Löschen: ${err.message}`, 'error');
  }
}

// ==================== Formular ====================

function addIngredientRow(name = '', packageCount = '1') {
  const list = byId('ingredients-list');
  const row = el('div', { class: 'ingredient-row' },
    el('input', { type: 'text', class: 'ingredient-name', placeholder: 'Zutat', 'aria-label': 'Zutat', value: name, required: true }),
    el('input', { type: 'number', class: 'ingredient-count', placeholder: 'Packungen', 'aria-label': 'Packungen', value: packageCount, min: '0.01', step: '0.01', inputmode: 'decimal', required: true }),
    el('button', {
      type: 'button', class: 'btn-remove-row', title: 'Zutat entfernen', 'aria-label': 'Zutat entfernen',
      onclick: () => {
        if (list.children.length > 1) row.remove();
        else showToast('Mindestens eine Zutat ist erforderlich.', 'error');
      },
    }, icon('close')));
  list.append(row);
}

function readIngredients() {
  return [...byId('ingredients-list').querySelectorAll('.ingredient-row')].map((row, sort_order) => ({
    name: row.querySelector('.ingredient-name').value.trim(),
    package_count: parseFloat(row.querySelector('.ingredient-count').value) || 0,
    sort_order,
  }));
}

function openMealForm(meal) {
  editingMealId = meal?.id ?? null;
  byId('meal-form-title').textContent = meal ? 'Gericht bearbeiten' : 'Neues Gericht';
  byId('meal-name').value = meal?.name ?? '';
  byId('meal-difficulty').value = String(meal?.difficulty ?? 1);
  byId('meal-portions').value = String(meal?.standard_portions ?? 2);
  hide(byId('meal-form-error'));

  byId('ingredients-list').replaceChildren();
  (meal?.ingredients ?? [{ name: '', package_count: '1' }]).forEach((ing) => addIngredientRow(ing.name, ing.package_count));
  openModal('meal-form-modal');
}

function validateMeal({ name, difficulty, standard_portions, ingredients }) {
  const errors = [];
  if (!name) errors.push('Name ist erforderlich.');
  if (![1, 2, 3].includes(difficulty)) errors.push('Schwierigkeit muss 1, 2 oder 3 sein.');
  if (!(standard_portions >= 1)) errors.push('Standardportionen müssen mindestens 1 sein.');
  ingredients.forEach((ing, i) => {
    if (!ing.name) errors.push(`Zutat ${i + 1}: Name ist erforderlich.`);
    if (!(ing.package_count > 0)) errors.push(`Zutat ${i + 1}: Packungsanzahl muss größer als 0 sein.`);
  });
  return errors;
}

async function submitMealForm(event) {
  event.preventDefault();
  const errorBox = byId('meal-form-error');
  hide(errorBox);

  const meal = {
    name: byId('meal-name').value.trim(),
    difficulty: parseInt(byId('meal-difficulty').value, 10),
    standard_portions: parseInt(byId('meal-portions').value, 10),
    ingredients: readIngredients(),
  };

  const errors = validateMeal(meal);
  if (errors.length > 0) {
    showError(errorBox, errors);
    return;
  }

  try {
    if (editingMealId) {
      await mealsApi.update(editingMealId, meal);
      showToast('Gericht aktualisiert.', 'success');
    } else {
      await mealsApi.create(meal);
      showToast('Gericht erstellt.', 'success');
    }
    closeModal('meal-form-modal');
    await loadMeals();
    notifyChanged();
  } catch (err) {
    showError(errorBox, err.details?.length ? err.details : err.message || 'Fehler beim Speichern.');
  }
}

export function initMeals() {
  byId('meal-search').addEventListener('input', debounce((event) => {
    searchTerm = event.target.value.trim();
    loadMeals();
  }, 300));

  byId('meal-difficulty-filter').addEventListener('change', (event) => {
    difficultyFilter = parseInt(event.target.value, 10);
    renderMeals();
  });
  byId('meal-sort').addEventListener('change', (event) => {
    sortMode = event.target.value;
    renderMeals();
  });

  byId('add-meal-btn').addEventListener('click', () => openMealForm(null));
  byId('add-ingredient-btn').addEventListener('click', () => addIngredientRow());
  byId('meal-form').addEventListener('submit', submitMealForm);
  bindClose('cancel-meal-form-btn', 'meal-form-modal');
}
