/**
 * Login und Logout (mit Sicherheitsabfrage).
 */
import { authApi } from './api.js';
import { byId, confirmDialog, hide, show, showError, el } from './dom.js';

/**
 * @param {{onLogin: () => void, onLogout: () => void}} handlers
 */
export function initAuth({ onLogin, onLogout }) {
  const errorBox = byId('login-error');

  byId('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    hide(errorBox);
    try {
      await authApi.login(byId('username').value, byId('password').value);
      byId('password').value = '';
      onLogin();
    } catch (err) {
      showError(errorBox, err.message || 'Anmeldung fehlgeschlagen.');
    }
  });

  byId('logout-btn').addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: 'Abmelden',
      body: el('p', {}, 'Möchtest du dich wirklich abmelden?'),
      confirmLabel: 'Abmelden',
      confirmIcon: 'log-out',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await authApi.logout();
    } catch {
      // Die Sitzung ist lokal ohnehin beendet – der Login wird trotzdem gezeigt.
    }
    onLogout();
  });
}

/** Prüft die Session; `true`, wenn der Nutzer angemeldet ist. */
export async function hasActiveSession() {
  try {
    return (await authApi.session()).authenticated === true;
  } catch {
    return false;
  }
}

export function showLoginPage() {
  show(byId('login-page'));
  hide(byId('app-page'));
  byId('login-form').reset();
  hide(byId('login-error'));
}

export function showAppPage() {
  hide(byId('login-page'));
  show(byId('app-page'));
}

