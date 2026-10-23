/**
 * Tab-Navigation. Die Einkaufsliste ist die Standardansicht.
 */

export const DEFAULT_TAB = 'shopping-list';

const buttons = () => document.querySelectorAll('.tab-btn');
const panels = () => document.querySelectorAll('.tab-content');

let activeTab = DEFAULT_TAB;
let onChange = () => {};

export function getActiveTab() {
  return activeTab;
}

export function selectTab(tab) {
  activeTab = tab;
  buttons().forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
    btn.tabIndex = active ? 0 : -1;
  });
  panels().forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${tab}`));
  onChange(tab);
}

/** @param {(tab: string) => void} handler wird bei jedem Tabwechsel aufgerufen */
export function initTabs(handler) {
  onChange = handler;
  const list = [...buttons()];

  list.forEach((btn, index) => {
    btn.addEventListener('click', () => selectTab(btn.dataset.tab));
    btn.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      const next = list[(index + step + list.length) % list.length];
      next.focus();
      selectTab(next.dataset.tab);
    });
  });
}

/** Setzt die Ansicht auf die Standardansicht zurück (z. B. nach dem Login). */
export function resetTabs() {
  selectTab(DEFAULT_TAB);
  window.scrollTo(0, 0);
}
