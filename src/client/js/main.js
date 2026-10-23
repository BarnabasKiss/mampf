/**
 * Mampf – Einstiegspunkt: verdrahtet die Module und steuert den Login-Zustand.
 */
import { initFooter } from './footer.js';
import { hasActiveSession, initAuth, showAppPage, showLoginPage } from './auth.js';
import { initMeals, loadMeals } from './meals.js';
import { initPlan, onPlanTabShown, refreshPlanData, restorePlan } from './plan.js';
import { initPullToRefresh } from './pull-to-refresh.js';
import { initShopping, refreshShopping, setShoppingActive } from './shopping.js';
import { getActiveTab, initTabs, resetTabs } from './tabs.js';
import { initTemplates } from './templates.js';
import { initTheme } from './theme.js';

function onTabChange(tab) {
  setShoppingActive(tab === 'shopping-list');
  if (tab === 'meals') loadMeals();
  if (tab === 'weekly-plan') onPlanTabShown();
}

/** Pull-to-refresh: lädt die Daten des gerade offenen Tabs neu. */
function refreshActiveTab() {
  switch (getActiveTab()) {
    case 'meals': return loadMeals();
    case 'weekly-plan': return refreshPlanData();
    default: return refreshShopping();
  }
}

function enterApp() {
  showAppPage();
  resetTabs(); // Standardansicht: Einkaufsliste
  restorePlan();
}

function leaveApp() {
  setShoppingActive(false);
  showLoginPage();
}

async function start() {
  initTheme();
  initFooter();
  initAuth({ onLogin: enterApp, onLogout: leaveApp });
  initTabs(onTabChange);
  initShopping();
  initTemplates();
  initMeals();
  initPlan();
  initPullToRefresh(refreshActiveTab);

  // Abgelaufene Session (HTTP 401) → zurück zum Login.
  document.addEventListener('auth:expired', leaveApp);

  if (await hasActiveSession()) enterApp();
  else leaveApp();
}

start();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service Worker Registrierung fehlgeschlagen:', err);
    });
  });
}
