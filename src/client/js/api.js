/**
 * API-Client für das Mampf-Backend.
 *
 * Läuft eine Session ab (HTTP 401 außerhalb des Logins), wird das Event
 * `auth:expired` auf `document` ausgelöst – die App zeigt dann den Login.
 */

async function request(method, url, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };
  if (body !== undefined) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && url !== '/api/login' && url !== '/api/session') {
      document.dispatchEvent(new CustomEvent('auth:expired'));
    }
    const error = new Error(data.error || 'Unbekannter Fehler');
    error.details = data.details;
    error.status = response.status;
    throw error;
  }
  return data;
}

const SHOPPING = '/api/shopping-list';

export const authApi = {
  login: (username, password) => request('POST', '/api/login', { username, password }),
  logout: () => request('POST', '/api/logout'),
  session: () => request('GET', '/api/session'),
};

export const mealsApi = {
  list: (search) => request('GET', `/api/meals${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  create: (meal) => request('POST', '/api/meals', meal),
  update: (id, meal) => request('PUT', `/api/meals/${id}`, meal),
  remove: (id) => request('DELETE', `/api/meals/${id}`),
  random: (count, excludeIds = []) => {
    const exclude = excludeIds.length > 0 ? `&exclude=${excludeIds.join(',')}` : '';
    return request('GET', `/api/meals/random?count=${count}${exclude}`);
  },
};

export const shoppingApi = {
  listItems: () => request('GET', SHOPPING),
  addItem: (name, amount, categoryId) => request('POST', SHOPPING, { name, amount, category_id: categoryId }),
  updateItem: (id, data) => request('PUT', `${SHOPPING}/${id}`, data),
  removeItem: (id) => request('DELETE', `${SHOPPING}/${id}`),
  clearChecked: () => request('POST', `${SHOPPING}/clear-checked`),
  addFromMeals: (items) => request('POST', `${SHOPPING}/from-meals`, { items }),

  listCategories: () => request('GET', `${SHOPPING}/categories`),
  addCategory: (name) => request('POST', `${SHOPPING}/categories`, { name }),
  renameCategory: (id, name) => request('PUT', `${SHOPPING}/categories/${id}`, { name }),
  removeCategory: (id) => request('DELETE', `${SHOPPING}/categories/${id}`),

  listTemplates: () => request('GET', `${SHOPPING}/templates`),
  createTemplate: (name, items) => request('POST', `${SHOPPING}/templates`, { name, items }),
  updateTemplate: (id, name, items) => request('PUT', `${SHOPPING}/templates/${id}`, { name, items }),
  removeTemplate: (id) => request('DELETE', `${SHOPPING}/templates/${id}`),
  applyTemplate: (id) => request('POST', `${SHOPPING}/templates/${id}/apply`),
};
