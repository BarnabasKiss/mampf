/**
 * Wochenplan: Gerichte würfeln, Portionen anpassen, als WhatsApp-Text
 * kopieren oder zur Einkaufsliste hinzufügen.
 *
 * Der Plan wird (nur Gericht-ID + Portionen) im localStorage gehalten, damit er
 * einen Neustart der PWA übersteht.
 */
import { mealsApi, shoppingApi } from './api.js';
import { buildWhatsAppText, planToShoppingItems, scaledIngredients } from './domain.js';
import {
  bindClose, byId, closeModal, debounce, el, icon, openModal, render, setVisible, showToast,
} from './dom.js';
import { difficultyBadge } from './meals.js';
import { readJson, writeJson } from './storage.js';

const STORAGE_KEY = 'mampf.weeklyPlan';

/** @type {{meal: object, portions: number}[]} */
let plan = [];
/** Alle Gerichte (für „auswählen“ und die Button-Zustände); wird bei Änderungen neu geladen. */
let catalog = [];
let catalogStale = true;

const planIds = () => plan.map((entry) => entry.meal.id);
const availableMeals = () => catalog.filter((meal) => !planIds().includes(meal.id));

// ==================== Persistenz ====================

function persist() {
  writeJson(STORAGE_KEY, plan.map(({ meal, portions }) => ({ id: meal.id, portions })));
}

/** Übernimmt aktuelle Gerichtsdaten in den Plan; gelöschte Gerichte fallen heraus. */
function syncPlanWithCatalog() {
  plan = plan
    .map((entry) => ({ ...entry, meal: catalog.find((m) => m.id === entry.meal.id) }))
    .filter((entry) => entry.meal);
  persist();
}

async function restore() {
  const saved = readJson(STORAGE_KEY, []);
  if (!Array.isArray(saved) || saved.length === 0) return;

  await refreshCatalog();
  plan = saved
    .map(({ id, portions }) => ({ meal: catalog.find((m) => m.id === id), portions }))
    .filter((entry) => entry.meal && entry.portions >= 1);
  renderPlan();
}

async function refreshCatalog() {
  try {
    catalog = await mealsApi.list();
    catalogStale = false;
  } catch (err) {
    showToast(`Fehler beim Laden der Gerichte: ${err.message}`, 'error');
  }
}

// ==================== Aktionen ====================

function setPlan(next) {
  plan = next;
  persist();
  renderPlan();
}

async function generatePlan() {
  try {
    const meals = await mealsApi.random(3);
    setPlan(meals.map((meal) => ({ meal, portions: meal.standard_portions })));
  } catch (err) {
    showToast(`Fehler beim Generieren: ${err.message}`, 'error');
  }
}

async function replaceMeal(index) {
  try {
    const [meal] = await mealsApi.random(1, planIds());
    if (!meal) {
      showToast('Kein alternatives Gericht verfügbar.', 'error');
      return;
    }
    setPlan(plan.map((entry, i) => (i === index ? { meal, portions: meal.standard_portions } : entry)));
  } catch (err) {
    showToast(`Fehler beim Ersetzen: ${err.message}`, 'error');
  }
}

async function addRandomMeal() {
  try {
    const [meal] = await mealsApi.random(1, planIds());
    if (!meal) {
      showToast('Kein weiteres Gericht verfügbar.', 'error');
      return;
    }
    setPlan([...plan, { meal, portions: meal.standard_portions }]);
    showToast(`„${meal.name}“ wurde hinzugefügt.`, 'success');
  } catch (err) {
    showToast(`Fehler: ${err.message}`, 'error');
  }
}

function changePortions(index, delta) {
  const portions = plan[index].portions + delta;
  if (portions < 1) return;
  setPlan(plan.map((entry, i) => (i === index ? { ...entry, portions } : entry)));
}

async function copyWhatsAppText() {
  const text = buildWhatsAppText(plan);
  let copied;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    copied = legacyCopy(text);
  }
  showToast(copied ? 'WhatsApp-Text kopiert!' : 'Fehler beim Kopieren.', copied ? 'success' : 'error');
}

/** Fallback für Browser ohne Clipboard-API (u. a. ältere iOS-Versionen). */
function legacyCopy(text) {
  const area = el('textarea', { readOnly: true, 'aria-hidden': 'true', class: 'offscreen-copy' });
  area.value = text;
  document.body.append(area);
  area.focus();
  area.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  area.remove();
  return copied;
}

async function addPlanToShoppingList() {
  const items = planToShoppingItems(plan);
  if (items.length === 0) {
    showToast('Kein Wochenplan vorhanden.', 'error');
    return;
  }
  try {
    await shoppingApi.addFromMeals(items);
    showToast('Zutaten zur Einkaufsliste hinzugefügt.', 'success');
  } catch (err) {
    showToast(`Fehler beim Hinzufügen: ${err.message}`, 'error');
  }
}

// ==================== Darstellung ====================

function renderPlan() {
  const empty = plan.length === 0;
  setVisible(byId('no-plan'), empty);
  setVisible(byId('plan-cards'), !empty);
  byId('copy-whatsapp-btn').disabled = empty;
  byId('add-to-shopping-btn').disabled = empty;

  const hasAvailable = !catalogStale && availableMeals().length > 0;
  byId('add-to-plan-btn').disabled = !hasAvailable;
  byId('random-add-plan-btn').disabled = !hasAvailable;

  render(byId('plan-cards'), plan.map((entry, index) => planCard(entry, index)));
}

function planCard(entry, index) {
  return el('article', { class: 'plan-card' },
    el('div', { class: 'plan-card-body' },
      el('div', { class: 'plan-card-header' },
        el('h3', {}, entry.meal.name),
        difficultyBadge(entry.meal.difficulty)),
      el('div', { class: 'portions-control' },
        el('span', {}, 'Portionen'),
        el('button', {
          type: 'button', class: 'stepper-btn', 'aria-label': 'Eine Portion weniger',
          disabled: entry.portions <= 1, onclick: () => changePortions(index, -1),
        }, '−'),
        el('output', { class: 'portions-value' }, String(entry.portions)),
        el('button', { type: 'button', class: 'stepper-btn', 'aria-label': 'Eine Portion mehr', onclick: () => changePortions(index, 1) }, '+')),
      el('ul', { class: 'plan-card-ingredients' },
        scaledIngredients(entry).map((ing) => el('li', {}, `${ing.packages} Stk. ${ing.name}`)))),
    el('div', { class: 'plan-card-actions' },
      el('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => replaceMeal(index) }, icon('refresh'), 'Neu auswählen'),
      el('button', { type: 'button', class: 'btn btn-danger btn-small', onclick: () => setPlan(plan.filter((_, i) => i !== index)) }, icon('trash'), 'Entfernen')));
}

// ==================== „Gericht auswählen“-Dialog ====================

function renderAvailableMeals(query = '') {
  const needle = query.trim().toLowerCase();
  const list = availableMeals().filter((meal) => meal.name.toLowerCase().includes(needle));

  if (list.length === 0) {
    render(byId('available-meals-list'), el('p', { class: 'empty-hint' }, 'Keine weiteren Gerichte verfügbar.'));
    return;
  }

  render(byId('available-meals-list'), list.map((meal) =>
    el('button', {
      type: 'button', class: 'available-meal-item',
      onclick: () => {
        closeModal('add-to-plan-modal');
        setPlan([...plan, { meal, portions: meal.standard_portions }]);
      },
    },
    el('span', { class: 'meal-info' },
      el('span', { class: 'meal-name' }, meal.name),
      el('span', { class: 'meal-meta' }, difficultyBadge(meal.difficulty), ` · ${meal.standard_portions} Port. · ${meal.ingredients.length} Zutaten`)),
    icon('add'))));
}

async function openAddToPlanModal() {
  if (catalogStale) await refreshCatalog();
  byId('modal-meal-search').value = '';
  renderAvailableMeals();
  openModal('add-to-plan-modal');
}

// ==================== Init ====================

/** Wird beim Wechsel auf den Wochenplan-Tab aufgerufen. */
export async function onPlanTabShown() {
  if (catalogStale) {
    await refreshCatalog();
    syncPlanWithCatalog();
  }
  renderPlan();
}

/** Ersetzt den Plan durch die übergebenen Gerichte (z. B. aus dem „Bauchgefühl“-Automaten des Anna-Themes). */
export function loadMealsIntoPlan(meals) {
  setPlan(meals.map((meal) => ({ meal, portions: meal.standard_portions })));
}

/** Lädt Gerichte neu und gleicht den Plan ab (z. B. per Pull-to-refresh). */
export function refreshPlanData() {
  catalogStale = true;
  return onPlanTabShown();
}

export function initPlan() {
  byId('generate-plan-btn').addEventListener('click', generatePlan);
  byId('add-to-plan-btn').addEventListener('click', openAddToPlanModal);
  byId('random-add-plan-btn').addEventListener('click', addRandomMeal);
  byId('copy-whatsapp-btn').addEventListener('click', copyWhatsAppText);
  byId('add-to-shopping-btn').addEventListener('click', addPlanToShoppingList);
  bindClose('cancel-add-to-plan-btn', 'add-to-plan-modal');
  byId('modal-meal-search').addEventListener('input', debounce((e) => renderAvailableMeals(e.target.value), 200));

  // Gerichte wurden geändert/gelöscht → Katalog und Plan beim nächsten Anzeigen neu abgleichen.
  document.addEventListener('meals:changed', () => {
    catalogStale = true;
  });

  renderPlan();
}

export const restorePlan = restore;
