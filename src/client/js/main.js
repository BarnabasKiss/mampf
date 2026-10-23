/**
 * Mampf – Einstiegspunkt: verdrahtet die Module und steuert den Login-Zustand.
 */
import { hasActiveSession, initAuth, showAppPage, showLoginPage } from './auth.js';
import { initMeals, loadMeals } from './meals.js';
import { initPlan, onPlanTabShown, restorePlan } from './plan.js';
import { initShopping, setShoppingActive } from './shopping.js';
import { initTabs, resetTabs } from './tabs.js';
import { initTemplates } from './templates.js';

function onTabChange(tab) {
  setShoppingActive(tab === 'shopping-list');
  if (tab === 'meals') loadMeals();
  if (tab === 'weekly-plan') onPlanTabShown();
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
  initAuth({ onLogin: enterApp, onLogout: leaveApp });
  initTabs(onTabChange);
  initShopping();
  initTemplates();
  initMeals();
  initPlan();

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
