/**
 * DOM-Helfer: Elementerzeugung ohne innerHTML, Icons, Toasts, Dialoge.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const PROPERTY_KEYS = new Set(['value', 'checked', 'disabled', 'textContent', 'type', 'maxLength', 'readOnly']);

/**
 * Erzeugt ein Element. Kinder (Strings, Nodes, Arrays) werden sicher als
 * Text bzw. Node angehängt – es wird nie HTML interpretiert.
 *
 * Props: `class`, `dataset`, `onclick`-artige Handler, bekannte Properties
 * (value, checked, disabled …); alles andere wird als Attribut gesetzt.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') {
      node.className = value;
    } else if (key === 'dataset') {
      Object.assign(node.dataset, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (PROPERTY_KEYS.has(key)) {
      node[key] = value;
    } else {
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Ersetzt den gesamten Inhalt eines Containers. */
export function render(container, ...children) {
  container.replaceChildren();
  appendChildren(container, children);
}

/** SVG-Icon aus dem lokalen Sprite (icons/sprite.svg). */
export function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `/icons/sprite.svg#i-${name}`);
  svg.append(use);
  return svg;
}

export const byId = (id) => document.getElementById(id);

export function show(node) {
  node.classList.remove('hidden');
}

export function hide(node) {
  node.classList.add('hidden');
}

export function setVisible(node, visible) {
  node.classList.toggle('hidden', !visible);
}

/** Zeigt eine Fehlermeldung in einem `.error-message`-Container. */
export function showError(container, messages) {
  const list = Array.isArray(messages) ? messages : [messages];
  render(container, list.map((message, i) => [i > 0 && el('br'), message]));
  show(container);
}

// ==================== Toast ====================

let toastTimer;

export function showToast(message, type = '') {
  const toast = byId('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`.trim();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hide(toast), 3000);
}

// ==================== Dialoge (<dialog>) ====================

export function openModal(id) {
  const dialog = byId(id);
  if (!dialog.open) dialog.showModal();
}

export function closeModal(id) {
  const dialog = byId(id);
  if (dialog.open) dialog.close();
}

/**
 * Generischer Bestätigungsdialog. Löst mit `true` auf, wenn bestätigt wurde.
 *
 * @param {{title: string, body: Array|string, confirmLabel?: string,
 *          danger?: boolean, confirmIcon?: string}} options
 */
export function confirmDialog({ title, body, confirmLabel = 'Bestätigen', danger = false, confirmIcon = 'checkmark-done' }) {
  const dialog = byId('confirm-dialog');
  const confirmBtn = byId('confirm-dialog-confirm');

  byId('confirm-dialog-title').textContent = title;
  render(byId('confirm-dialog-body'), body);
  render(confirmBtn, icon(confirmIcon), confirmLabel);
  confirmBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;

  return new Promise((resolve) => {
    dialog.returnValue = 'cancel';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.showModal();
    byId('confirm-dialog-cancel').focus();
  });
}

/** Bindet einen Button so, dass er den umgebenden Dialog schließt. */
export function bindClose(buttonId, modalId) {
  byId(buttonId).addEventListener('click', () => closeModal(modalId));
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
