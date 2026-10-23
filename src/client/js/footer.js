/**
 * Fußzeile mit dem Schalter für das optionale Anna-Theme.
 * Das Theme wird erst beim Einschalten nachgeladen und beim Ausschalten rückstandslos entfernt.
 */
import { loadAnnaSettings, saveAnnaSettings } from './anna-settings.js';
import { byId, showToast } from './dom.js';

let anna = null;

async function turnOn({ announce }) {
  try {
    anna ??= await import('/anna/anna.js');
    await anna.enableAnna({ controls: byId('anna-controls'), announce });
  } catch (err) {
    console.error('Anna-Theme konnte nicht geladen werden:', err);
    saveAnnaSettings({ enabled: false });
    byId('anna-toggle').checked = false;
    showToast('Das Anna-Theme konnte nicht geladen werden.', 'error');
  }
}

export function initFooter() {
  const toggle = byId('anna-toggle');
  toggle.checked = loadAnnaSettings().enabled;
  if (toggle.checked) turnOn({ announce: false });

  toggle.addEventListener('change', () => {
    saveAnnaSettings({ enabled: toggle.checked });
    if (toggle.checked) turnOn({ announce: true });
    else anna?.disableAnna();
  });
}
