/* ================================================================
   Mampf – Wochen-Essensplaner
   Frontend-Hauptmodul (Vanilla JavaScript)
   ================================================================ */

// ==================== API-Client ====================

const api = {
  async request(method, url, body) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Unbekannter Fehler');
      error.details = data.details;
      error.status = response.status;
      throw error;
    }
    return data;
  },

  login(username, password) {
    return this.request('POST', '/api/login', { username, password });
  },

  logout() {
    return this.request('POST', '/api/logout');
  },

  checkSession() {
    return this.request('GET', '/api/session');
  },

  getMeals(search) {
    var url = '/api/meals';
    if (search) {
      url += '?search=' + encodeURIComponent(search);
    }
    return this.request('GET', url);
  },

  getMeal(id) {
    return this.request('GET', '/api/meals/' + id);
  },

  createMeal(meal) {
    return this.request('POST', '/api/meals', meal);
  },

  updateMeal(id, meal) {
    return this.request('PUT', '/api/meals/' + id, meal);
  },

  deleteMeal(id) {
    return this.request('DELETE', '/api/meals/' + id);
  },

  getRandomMeals(count, excludeIds) {
    var url = '/api/meals/random?count=' + count;
    if (excludeIds && excludeIds.length > 0) {
      url += '&exclude=' + excludeIds.join(',');
    }
    return this.request('GET', url);
  },

  // ===== Einkaufsliste =====
  getShoppingItems() {
    return this.request('GET', '/api/shopping-list');
  },

  addShoppingItem(name, amount, categoryId) {
    return this.request('POST', '/api/shopping-list', { name, amount, category_id: categoryId });
  },

  updateShoppingItem(id, data) {
    return this.request('PUT', '/api/shopping-list/' + id, data);
  },

  deleteShoppingItem(id) {
    return this.request('DELETE', '/api/shopping-list/' + id);
  },

  clearCheckedShoppingItems() {
    return this.request('POST', '/api/shopping-list/clear-checked');
  },

  addShoppingItemsFromMeals(items) {
    return this.request('POST', '/api/shopping-list/from-meals', { items });
  },

  // ===== Kategorien =====
  getShoppingCategories() {
    return this.request('GET', '/api/shopping-list/categories');
  },

  addShoppingCategory(name) {
    return this.request('POST', '/api/shopping-list/categories', { name });
  },

  renameShoppingCategory(id, name) {
    return this.request('PUT', '/api/shopping-list/categories/' + id, { name });
  },

  deleteShoppingCategory(id) {
    return this.request('DELETE', '/api/shopping-list/categories/' + id);
  },

  // ===== Vorlagen =====
  getShoppingTemplates() {
    return this.request('GET', '/api/shopping-list/templates');
  },

  createShoppingTemplate(name, items) {
    return this.request('POST', '/api/shopping-list/templates', { name, items });
  },

  updateShoppingTemplate(id, name, items) {
    return this.request('PUT', '/api/shopping-list/templates/' + id, { name, items });
  },

  deleteShoppingTemplate(id) {
    return this.request('DELETE', '/api/shopping-list/templates/' + id);
  },

  applyShoppingTemplate(id) {
    return this.request('POST', '/api/shopping-list/templates/' + id + '/apply');
  },
};

// ==================== Hilfsfunktionen ====================

function showToast(message, type) {
  var toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + (type || '');
  toast.classList.remove('hidden');
  setTimeout(function () {
    toast.classList.add('hidden');
  }, 3000);
}

function showModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function difficultyBadge(difficulty) {
  var labels = ['Einfach', 'Mittel', 'Schwer'];
  var css = ['easy', 'medium', 'hard'];
  var dots = '';
  for (var i = 1; i <= 3; i++) {
    dots += (i <= difficulty) ? '●' : '○';
  }
  return '<span class="difficulty-badge ' + css[difficulty - 1] + '">' +
    '<span class="dots">' + dots + '</span> ' + labels[difficulty - 1] +
    '</span>';
}

function ingredientsPreview(ingredients) {
  if (!ingredients || ingredients.length === 0) return '–';
  var names = ingredients.map(function (ing) { return ing.name; });
  return names.join(', ');
}

function calculatePackages(packageCount, standardPortions, desiredPortions) {
  return Math.ceil(packageCount * (desiredPortions / standardPortions));
}

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function isMobile() {
  return window.innerWidth <= 768;
}

// ==================== Login ====================

function initLogin() {
  var form = document.getElementById('login-form');
  var errorDiv = document.getElementById('login-error');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    errorDiv.classList.add('hidden');

    try {
      await api.login(username, password);
      showApp();
    } catch (err) {
      errorDiv.textContent = err.message || 'Anmeldung fehlgeschlagen.';
      errorDiv.classList.remove('hidden');
    }
  });
}

// ==================== Navigation & Tabs ====================

function initNavigation() {
  var tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tab = this.getAttribute('data-tab');

      tabButtons.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(function (content) {
        content.classList.remove('active');
      });
      document.getElementById('tab-' + tab).classList.add('active');

      if (tab === 'weekly-plan') {
        renderWeeklyPlan();
      }

      if (tab === 'shopping-list') {
        loadShoppingItems();
        loadShoppingCategories();
        loadShoppingTemplates();
      }
    });
  });

  document.getElementById('logout-btn').addEventListener('click', async function () {
    try {
      await api.logout();
    } catch (e) { /* ignorieren */ }
    showLogin();
  });
}

// ==================== Gerichte (Tabelle + Mobile Cards) ====================

var allMeals = [];

async function loadMeals(search) {
  try {
    allMeals = await api.getMeals(search || '');
    renderMealsView();
  } catch (err) {
    showToast('Fehler beim Laden der Gerichte: ' + err.message, 'error');
  }
}

async function duplicateMeal(meal) {
  try {
    var duplicate = {
      name: meal.name + ' (Kopie)',
      difficulty: meal.difficulty,
      standard_portions: meal.standard_portions,
      ingredients: meal.ingredients.map(function (ing, i) {
        return {
          name: ing.name,
          package_count: ing.package_count,
          sort_order: i,
        };
      }),
    };
    await api.createMeal(duplicate);
    showToast('Gericht dupliziert.', 'success');
    loadMeals(document.getElementById('meal-search').value);
  } catch (err) {
    showToast('Fehler beim Duplizieren: ' + err.message, 'error');
  }
}

function renderMealsView() {
  if (isMobile()) {
    renderMealsCards();
  } else {
    renderMealsTable();
  }
}

function renderMealsTable() {
  var tbody = document.getElementById('meals-tbody');
  var tableContainer = document.querySelector('.table-responsive');
  var noMeals = document.getElementById('no-meals');
  var cardsContainer = document.getElementById('meals-cards');

  tbody.innerHTML = '';
  if (tableContainer) tableContainer.style.display = '';
  if (cardsContainer) cardsContainer.classList.add('hidden');

  if (allMeals.length === 0) {
    if (tableContainer) tableContainer.style.display = 'none';
    noMeals.classList.remove('hidden');
  } else {
    if (tableContainer) tableContainer.style.display = '';
    noMeals.classList.add('hidden');

    allMeals.forEach(function (meal) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><strong>' + escapeHtml(meal.name) + '</strong></td>' +
        '<td>' + difficultyBadge(meal.difficulty) + '</td>' +
        '<td>' + meal.standard_portions + '</td>' +
        '<td class="ingredients-preview">' + escapeHtml(ingredientsPreview(meal.ingredients)) + '</td>' +
        '<td class="actions-cell">' +
          '<button class="btn-icon btn-icon-edit edit-meal-btn" data-id="' + meal.id + '" title="Bearbeiten"><ion-icon name="create-outline"></ion-icon></button>' +
          '<button class="btn-icon btn-icon-duplicate duplicate-meal-btn" data-id="' + meal.id + '" title="Duplizieren"><ion-icon name="copy-outline"></ion-icon></button>' +
          '<button class="btn-icon btn-icon-delete delete-meal-btn" data-id="' + meal.id + '" title="Löschen"><ion-icon name="trash-outline"></ion-icon></button>' +
        '</td>';
      tbody.appendChild(tr);
    });

    bindMealTableEvents(tbody);
  }
}

function renderMealsCards() {
  var tableContainer = document.querySelector('.table-responsive');
  var noMeals = document.getElementById('no-meals');
  var cardsContainer = document.getElementById('meals-cards');

  if (tableContainer) tableContainer.style.display = 'none';
  cardsContainer.innerHTML = '';
  cardsContainer.classList.remove('hidden');

  if (allMeals.length === 0) {
    cardsContainer.classList.add('hidden');
    noMeals.classList.remove('hidden');
  } else {
    noMeals.classList.add('hidden');

    allMeals.forEach(function (meal) {
      var card = document.createElement('div');
      card.className = 'meal-card';
      card.innerHTML =
        '<div class="meal-card-header">' +
          '<strong>' + escapeHtml(meal.name) + '</strong>' +
          difficultyBadge(meal.difficulty) +
        '</div>' +
        '<div class="meal-card-meta">' +
          '<span>' + meal.standard_portions + ' Portionen</span>' +
        '</div>' +
        '<div class="meal-card-ingredients">' + escapeHtml(ingredientsPreview(meal.ingredients)) + '</div>' +
        '<div class="meal-card-actions">' +
          '<button class="btn-icon btn-icon-edit edit-meal-btn" data-id="' + meal.id + '" title="Bearbeiten"><ion-icon name="create-outline"></ion-icon></button>' +
          '<button class="btn-icon btn-icon-duplicate duplicate-meal-btn" data-id="' + meal.id + '" title="Duplizieren"><ion-icon name="copy-outline"></ion-icon></button>' +
          '<button class="btn-icon btn-icon-delete delete-meal-btn" data-id="' + meal.id + '" title="Löschen"><ion-icon name="trash-outline"></ion-icon></button>' +
        '</div>';
      cardsContainer.appendChild(card);
    });

    bindMealTableEvents(cardsContainer);
  }
}

function bindMealTableEvents(container) {
  container.querySelectorAll('.edit-meal-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = parseInt(this.getAttribute('data-id'));
      var meal = allMeals.find(function (m) { return m.id === id; });
      if (meal) openMealForm(meal);
    });
  });

  container.querySelectorAll('.duplicate-meal-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = parseInt(this.getAttribute('data-id'));
      var meal = allMeals.find(function (m) { return m.id === id; });
      if (meal) duplicateMeal(meal);
    });
  });

  container.querySelectorAll('.delete-meal-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = parseInt(this.getAttribute('data-id'));
      var meal = allMeals.find(function (m) { return m.id === id; });
      if (meal) openDeleteConfirm(meal);
    });
  });
}

function initMealsTab() {
  var searchInput = document.getElementById('meal-search');
  var searchTimeout;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function () {
      loadMeals(searchInput.value);
    }, 300);
  });

  document.getElementById('add-meal-btn').addEventListener('click', function () {
    openMealForm(null);
  });

  // Re-render on resize (table ↔ cards)
  window.addEventListener('resize', function () {
    if (allMeals.length > 0) {
      renderMealsView();
    }
  });

  loadMeals();
}

// ==================== Gerichte-Formular ====================

var editingMealId = null;

function openMealForm(meal) {
  editingMealId = meal ? meal.id : null;

  document.getElementById('meal-form-title').textContent = meal ? 'Gericht bearbeiten' : 'Neues Gericht';
  document.getElementById('meal-id').value = meal ? meal.id : '';
  document.getElementById('meal-name').value = meal ? meal.name : '';
  document.getElementById('meal-difficulty').value = meal ? meal.difficulty : '1';
  document.getElementById('meal-portions').value = meal ? meal.standard_portions : '2';
  document.getElementById('meal-form-error').classList.add('hidden');

  var ingredientsList = document.getElementById('ingredients-list');
  ingredientsList.innerHTML = '';

  var ingredients = meal ? meal.ingredients : [{ name: '', package_count: '1' }];
  ingredients.forEach(function (ing) {
    addIngredientRow(ing.name, ing.package_count);
  });

  showModal('meal-form-modal');
}

function addIngredientRow(name, packageCount) {
  var ingredientsList = document.getElementById('ingredients-list');
  var row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML =
    '<input type="text" class="ingredient-name" placeholder="Zutatenname" value="' + escapeHtml(name || '') + '" required>' +
    '<input type="number" class="ingredient-count" placeholder="Packungen" value="' + (packageCount || '1') + '" min="0.01" step="0.01" required>' +
    '<button type="button" class="btn-remove-ingredient" title="Zutat entfernen">✕</button>';

  row.querySelector('.btn-remove-ingredient').addEventListener('click', function () {
    var rows = ingredientsList.querySelectorAll('.ingredient-row');
    if (rows.length > 1) {
      row.remove();
    } else {
      showToast('Mindestens eine Zutat ist erforderlich.', 'error');
    }
  });

  ingredientsList.appendChild(row);
}

function getFormIngredients() {
  var rows = document.querySelectorAll('#ingredients-list .ingredient-row');
  var ingredients = [];
  rows.forEach(function (row, index) {
    var nameInput = row.querySelector('.ingredient-name');
    var countInput = row.querySelector('.ingredient-count');
    ingredients.push({
      name: nameInput.value.trim(),
      package_count: parseFloat(countInput.value) || 0,
      sort_order: index,
    });
  });
  return ingredients;
}

function initMealForm() {
  document.getElementById('add-ingredient-btn').addEventListener('click', function () {
    addIngredientRow('', '1');
  });

  document.getElementById('cancel-meal-form-btn').addEventListener('click', function () {
    hideModal('meal-form-modal');
  });

  document.getElementById('meal-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var errorDiv = document.getElementById('meal-form-error');
    errorDiv.classList.add('hidden');

    var name = document.getElementById('meal-name').value.trim();
    var difficulty = parseInt(document.getElementById('meal-difficulty').value);
    var standardPortions = parseInt(document.getElementById('meal-portions').value);
    var ingredients = getFormIngredients();

    var errors = [];
    if (!name) errors.push('Name ist erforderlich.');
    if (isNaN(difficulty) || difficulty < 1 || difficulty > 3) errors.push('Schwierigkeit muss 1, 2 oder 3 sein.');
    if (isNaN(standardPortions) || standardPortions < 1) errors.push('Standardportionen müssen mindestens 1 sein.');
    if (ingredients.length === 0) {
      errors.push('Mindestens eine Zutat ist erforderlich.');
    } else {
      ingredients.forEach(function (ing, i) {
        if (!ing.name) errors.push('Zutat ' + (i + 1) + ': Name ist erforderlich.');
        if (isNaN(ing.package_count) || ing.package_count <= 0) errors.push('Zutat ' + (i + 1) + ': Packungsanzahl muss größer als 0 sein.');
      });
    }

    if (errors.length > 0) {
      errorDiv.innerHTML = errors.join('<br>');
      errorDiv.classList.remove('hidden');
      return;
    }

    var mealData = {
      name: name,
      difficulty: difficulty,
      standard_portions: standardPortions,
      ingredients: ingredients,
    };

    try {
      if (editingMealId) {
        await api.updateMeal(editingMealId, mealData);
        showToast('Gericht aktualisiert.', 'success');
      } else {
        await api.createMeal(mealData);
        showToast('Gericht erstellt.', 'success');
      }
      hideModal('meal-form-modal');
      loadMeals(document.getElementById('meal-search').value);
    } catch (err) {
      var msg = err.message || 'Fehler beim Speichern.';
      if (err.details && err.details.length > 0) {
        msg = err.details.join('<br>');
      }
      errorDiv.innerHTML = msg;
      errorDiv.classList.remove('hidden');
    }
  });

}

// ==================== Löschen-Bestätigung ====================

var deleteMealId = null;

function openDeleteConfirm(meal) {
  deleteMealId = meal.id;
  document.getElementById('delete-meal-name').textContent = meal.name;
  showModal('delete-confirm-modal');
}

function initDeleteConfirm() {
  document.getElementById('confirm-delete-btn').addEventListener('click', async function () {
    if (!deleteMealId) return;
    try {
      await api.deleteMeal(deleteMealId);
      showToast('Gericht gelöscht.', 'success');
      hideModal('delete-confirm-modal');
      var deletedId = deleteMealId;
      deleteMealId = null;
      loadMeals(document.getElementById('meal-search').value);
      if (weeklyPlan.some(function (item) { return item.meal.id === deletedId; })) {
        weeklyPlan = [];
        renderWeeklyPlan();
      }
    } catch (err) {
      showToast('Fehler beim Löschen: ' + err.message, 'error');
    }
  });

  document.getElementById('cancel-delete-btn').addEventListener('click', function () {
    hideModal('delete-confirm-modal');
    deleteMealId = null;
  });
}

// ==================== Wochenplan ====================

var weeklyPlan = [];

async function generatePlan(count) {
  try {
    weeklyPlan = [];
    var meals = await api.getRandomMeals(count || 3, []);

    meals.forEach(function (meal) {
      weeklyPlan.push({
        meal: meal,
        portions: meal.standard_portions,
      });
    });

    renderWeeklyPlan();
  } catch (err) {
    showToast('Fehler beim Generieren: ' + err.message, 'error');
  }
}

async function replaceMeal(index) {
  try {
    var excludeIds = weeklyPlan.map(function (item) { return item.meal.id; });
    var meals = await api.getRandomMeals(1, excludeIds);

    if (meals.length > 0) {
      weeklyPlan[index] = {
        meal: meals[0],
        portions: meals[0].standard_portions,
      };
      renderWeeklyPlan();
    } else {
      showToast('Kein alternatives Gericht verfügbar.', 'error');
    }
  } catch (err) {
    showToast('Fehler beim Ersetzen: ' + err.message, 'error');
  }
}

function removeMeal(index) {
  weeklyPlan.splice(index, 1);
  renderWeeklyPlan();
}

function changePortions(index, delta) {
  var item = weeklyPlan[index];
  var newPortions = item.portions + delta;
  if (newPortions >= 1) {
    item.portions = newPortions;
    renderWeeklyPlan();
  }
}

function renderWeeklyPlan() {
  var noPlan = document.getElementById('no-plan');
  var planCards = document.getElementById('plan-cards');
  var copyBtn = document.getElementById('copy-whatsapp-btn');

  if (weeklyPlan.length === 0) {
    noPlan.classList.remove('hidden');
    planCards.classList.add('hidden');
    copyBtn.disabled = true;
  } else {
    noPlan.classList.add('hidden');
    planCards.classList.remove('hidden');
    copyBtn.disabled = false;

    planCards.innerHTML = '';

    weeklyPlan.forEach(function (item, index) {
      var card = document.createElement('div');
      card.className = 'plan-card';

      var ingredientsHtml = '';
      item.meal.ingredients.forEach(function (ing) {
        var packages = calculatePackages(ing.package_count, item.meal.standard_portions, item.portions);
        ingredientsHtml += '<li>' + packages + ' Stk. ' + escapeHtml(ing.name) + '</li>';
      });

      card.innerHTML =
        '<div class="plan-card-body">' +
          '<div class="plan-card-header">' +
            '<h3>' + escapeHtml(item.meal.name) + '</h3>' +
            '<div class="plan-card-difficulty">' + difficultyBadge(item.meal.difficulty) + '</div>' +
          '</div>' +
          '<div class="portions-control">' +
            '<label>Portionen:</label>' +
            '<button class="btn-portions-minus" data-index="' + index + '"' + (item.portions <= 1 ? ' disabled' : '') + '>−</button>' +
            '<span class="portions-value">' + item.portions + '</span>' +
            '<button class="btn-portions-plus" data-index="' + index + '">+</button>' +
          '</div>' +
          '<ul class="plan-card-ingredients">' +
            ingredientsHtml +
          '</ul>' +
        '</div>' +
        '<div class="plan-card-actions">' +
          '<button class="btn btn-secondary btn-small btn-replace-meal" data-index="' + index + '"><ion-icon name="refresh-outline"></ion-icon> Neu auswählen</button>' +
          '<button class="btn btn-danger btn-small btn-remove-meal" data-index="' + index + '"><ion-icon name="trash-outline"></ion-icon> Entfernen</button>' +
        '</div>';

      planCards.appendChild(card);
    });

    planCards.querySelectorAll('.btn-portions-minus').forEach(function (btn) {
      btn.addEventListener('click', function () {
        changePortions(parseInt(this.getAttribute('data-index')), -1);
      });
    });

    planCards.querySelectorAll('.btn-portions-plus').forEach(function (btn) {
      btn.addEventListener('click', function () {
        changePortions(parseInt(this.getAttribute('data-index')), 1);
      });
    });

    planCards.querySelectorAll('.btn-replace-meal').forEach(function (btn) {
      btn.addEventListener('click', function () {
        replaceMeal(parseInt(this.getAttribute('data-index')));
      });
    });

    planCards.querySelectorAll('.btn-remove-meal').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeMeal(parseInt(this.getAttribute('data-index')));
      });
    });
  }

  updateAddToPlanButton();
}

async function updateAddToPlanButton() {
  var addToPlanBtn = document.getElementById('add-to-plan-btn');
  var randomBtn = document.getElementById('random-add-plan-btn');
  try {
    var allMealsData = await api.getMeals();
    var planIds = weeklyPlan.map(function (item) { return item.meal.id; });
    var available = allMealsData.filter(function (m) { return planIds.indexOf(m.id) === -1; });
    var hasAvailable = available.length > 0;
    addToPlanBtn.disabled = !hasAvailable;
    randomBtn.disabled = !hasAvailable;
  } catch (err) {
    addToPlanBtn.disabled = true;
    randomBtn.disabled = true;
  }
}

// Modal: Gericht auswählen (mit Suche)
async function showAddToPlanModal() {
  try {
    var allMealsData = await api.getMeals();
    window._addToPlanAllMeals = allMealsData;
    renderAvailableMealsList(allMealsData);
    document.getElementById('modal-meal-search').value = '';
    showModal('add-to-plan-modal');
  } catch (err) {
    showToast('Fehler beim Laden der Gerichte: ' + err.message, 'error');
  }
}

function renderAvailableMealsList(meals) {
  var planIds = weeklyPlan.map(function (item) { return item.meal.id; });
  var available = meals.filter(function (m) { return planIds.indexOf(m.id) === -1; });

  var list = document.getElementById('available-meals-list');
  list.innerHTML = '';

  if (available.length === 0) {
    list.innerHTML = '<p style="text-align:center;padding:20px;color:var(--color-text-light)">Keine weiteren Gerichte verfügbar.</p>';
  } else {
    available.forEach(function (meal) {
      var itemEl = document.createElement('div');
      itemEl.className = 'available-meal-item';
      itemEl.innerHTML =
        '<div class="meal-info">' +
          '<span class="meal-name">' + escapeHtml(meal.name) + '</span>' +
          '<span class="meal-meta">' + difficultyBadge(meal.difficulty) + ' · ' + meal.standard_portions + ' Port. · ' + meal.ingredients.length + ' Zutaten</span>' +
        '</div>' +
        '<button class="btn btn-primary btn-small"><ion-icon name="add-outline"></ion-icon></button>';

      itemEl.querySelector('button').addEventListener('click', function (e) {
        e.stopPropagation();
        weeklyPlan.push({ meal: meal, portions: meal.standard_portions });
        hideModal('add-to-plan-modal');
        renderWeeklyPlan();
      });

      itemEl.addEventListener('click', function () {
        weeklyPlan.push({ meal: meal, portions: meal.standard_portions });
        hideModal('add-to-plan-modal');
        renderWeeklyPlan();
      });

      list.appendChild(itemEl);
    });
  }
}

// Zufällig ein Gericht zum Plan hinzufügen
async function addRandomToPlan() {
  try {
    var planIds = weeklyPlan.map(function (item) { return item.meal.id; });
    var meals = await api.getRandomMeals(1, planIds);

    if (meals.length > 0) {
      weeklyPlan.push({
        meal: meals[0],
        portions: meals[0].standard_portions,
      });
      renderWeeklyPlan();
      showToast('"' + meals[0].name + '" wurde hinzugefügt.', 'success');
    } else {
      showToast('Kein weiteres Gericht verfügbar.', 'error');
    }
  } catch (err) {
    showToast('Fehler: ' + err.message, 'error');
  }
}

function generateWhatsAppText() {
  var text = '';
  weeklyPlan.forEach(function (item) {
    text += '*' + item.meal.name + '*\n';
    text += '*' + item.portions + ' Portionen*\n';
    item.meal.ingredients.forEach(function (ing) {
      var packages = calculatePackages(ing.package_count, item.meal.standard_portions, item.portions);
      text += '- ' + packages + ' Stk. ' + ing.name + '\n';
    });
    text += '\n';
  });
  return text.trim();
}

async function copyWhatsAppText() {
  var text = generateWhatsAppText();
  try {
    await navigator.clipboard.writeText(text);
    showToast('WhatsApp-Text kopiert!', 'success');
  } catch (err) {
    // iOS-Safari compatible fallback: readonly textarea with setSelectionRange
    var el = document.createElement('textarea');
    el.readOnly = true;
    el.contentEditable = true;
    el.value = text;
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = (window.scrollY + 100) + 'px';
    el.style.width = '1px';
    el.style.height = '1px';
    el.style.fontSize = '16px';
    el.style.opacity = '0';
    el.style.border = 'none';
    el.style.padding = '0';
    document.body.appendChild(el);
    el.focus();
    el.setSelectionRange(0, text.length);
    try {
      document.execCommand('copy');
      showToast('WhatsApp-Text kopiert!', 'success');
    } catch (e) {
      showToast('Fehler beim Kopieren.', 'error');
    }
    document.body.removeChild(el);
  }
}

function initWeeklyPlan() {
  document.getElementById('generate-plan-btn').addEventListener('click', function () {
    generatePlan(3);
  });

  document.getElementById('add-to-plan-btn').addEventListener('click', function () {
    showAddToPlanModal();
  });

  document.getElementById('random-add-plan-btn').addEventListener('click', function () {
    addRandomToPlan();
  });

  document.getElementById('copy-whatsapp-btn').addEventListener('click', function () {
    copyWhatsAppText();
  });

  document.getElementById('add-to-shopping-btn').addEventListener('click', function () {
    addWeeklyPlanToShoppingList();
  });

  document.getElementById('cancel-add-to-plan-btn').addEventListener('click', function () {
    hideModal('add-to-plan-modal');
  });

  // Modal-Suche
  var modalSearch = document.getElementById('modal-meal-search');
  var modalSearchTimeout;
  modalSearch.addEventListener('input', function () {
    clearTimeout(modalSearchTimeout);
    modalSearchTimeout = setTimeout(function () {
      var query = modalSearch.value.trim().toLowerCase();
      var all = window._addToPlanAllMeals || [];
      if (query === '') {
        renderAvailableMealsList(all);
      } else {
        var filtered = all.filter(function (m) {
          return m.name.toLowerCase().indexOf(query) !== -1;
        });
        renderAvailableMealsList(filtered);
      }
    }, 200);
  });
}

// ==================== Einkaufsliste ====================

var shoppingItems = [];
var shoppingCategories = [];
var shoppingTemplates = [];
var shoppingPollTimer = null;
var shoppingPollActive = false;
var collapsedCategories = {};
var openCategoryMenu = null;
var renamingCategoryId = null;

// (Nicht-hardcodierte Kategorie-IDs der eingeklappten Sektionen werden unter 'null' gespeichert)

function setSyncIndicator(state) {
  var indicator = document.getElementById('sync-indicator');
  if (!indicator) return;
  if (state === 'syncing') {
    indicator.classList.add('syncing');
  } else if (state === 'error') {
    indicator.classList.add('error');
  } else {
    indicator.classList.remove('syncing');
    indicator.classList.remove('error');
  }
}

async function loadShoppingItems() {
  try {
    setSyncIndicator('syncing');
    var items = await api.getShoppingItems();
    shoppingItems = items;
    renderShoppingItems();
    setSyncIndicator('ok');
  } catch (err) {
    setSyncIndicator('error');
    if (err.status !== 401) {
      showToast('Fehler beim Laden der Einkaufsliste: ' + err.message, 'error');
    }
  }
}

async function loadShoppingTemplates() {
  try {
    shoppingTemplates = await api.getShoppingTemplates();
    renderTemplatesList();
  } catch (err) {
    showToast('Fehler beim Laden der Vorlagen: ' + err.message, 'error');
  }
}

async function loadShoppingCategories() {
  try {
    shoppingCategories = await api.getShoppingCategories();
    renderShoppingItems();
  } catch (err) {
    showToast('Fehler beim Laden der Kategorien: ' + err.message, 'error');
  }
}

var shoppingInputFocused = false;

function renderShoppingItems() {
  var container = document.getElementById('shopping-categories');
  var noItems = document.getElementById('no-shopping-items');
  if (!container) return;
  container.innerHTML = '';

  if (shoppingItems.length === 0 && shoppingCategories.length === 0) {
    noItems.classList.remove('hidden');
    return;
  }
  noItems.classList.add('hidden');

  var groups = groupShoppingItems();

  groups.forEach(function (group) {
    var section = document.createElement('div');
    section.className = 'shopping-category';

    var catId = group.category ? group.category.id : null;
    var isCollapsed = collapsedCategories[catId] === true;
    var isLast = shoppingCategories.length <= 1;

    var header = document.createElement('div');
    header.className = 'shopping-category-header';
    header.setAttribute('data-id', catId === null ? 'null' : String(catId));

    var chevronBtn = document.createElement('button');
    chevronBtn.className = 'cat-collapse-btn';
    chevronBtn.setAttribute('type', 'button');
    chevronBtn.setAttribute('data-id', catId === null ? 'null' : String(catId));
    chevronBtn.innerHTML = isCollapsed
      ? '<ion-icon name="chevron-forward-outline"></ion-icon>'
      : '<ion-icon name="chevron-down-outline"></ion-icon>';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'cat-name';
    nameSpan.textContent = group.category ? group.category.name : 'Allgemein';

    header.appendChild(chevronBtn);
    header.appendChild(nameSpan);

    if (group.category) {
      var menuBtn = document.createElement('button');
      menuBtn.className = 'cat-menu-btn';
      menuBtn.setAttribute('type', 'button');
      menuBtn.setAttribute('data-id', catId);
      menuBtn.title = 'Optionen';
      menuBtn.textContent = '\u22ee';
      header.appendChild(menuBtn);

      if (openCategoryMenu === catId) {
        var menu = document.createElement('div');
        menu.className = 'cat-menu';

        var renameItem = document.createElement('button');
        renameItem.className = 'cat-menu-action';
        renameItem.setAttribute('type', 'button');
        renameItem.setAttribute('data-id', catId);
        renameItem.setAttribute('data-action', 'rename');
        renameItem.textContent = 'Umbenennen';

        var deleteItem = document.createElement('button');
        deleteItem.className = 'cat-menu-action';
        deleteItem.setAttribute('type', 'button');
        deleteItem.setAttribute('data-id', catId);
        deleteItem.setAttribute('data-action', 'delete');
        deleteItem.textContent = 'Löschen';
        if (isLast) deleteItem.disabled = true;

        menu.appendChild(renameItem);
        menu.appendChild(deleteItem);
        header.appendChild(menu);
      }
    }

    section.appendChild(header);

    var body = document.createElement('div');
    body.className = 'shopping-category-body';
    if (!isCollapsed) {
      var table = document.createElement('table');
      table.className = 'shopping-table';
      var thead = document.createElement('thead');
      var headRow = document.createElement('tr');
      headRow.innerHTML =
        '<th class="th-check"></th>' +
        '<th>Name</th>' +
        '<th class="th-amount">Menge</th>' +
        '<th class="th-actions"></th>';
      thead.appendChild(headRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      var sorted = group.items.slice().sort(function (a, b) {
        return (a.checked ? 1 : 0) - (b.checked ? 1 : 0) || a.id - b.id;
      });

      sorted.forEach(function (item) {
        var tr = document.createElement('tr');
        tr.className = item.checked ? 'shopping-item-checked' : '';
        tr.innerHTML =
          '<td class="th-check-container">' +
            '<input type="checkbox" class="shopping-checkbox" data-id="' + item.id + '"' + (item.checked ? ' checked' : '') + '>' +
          '</td>' +
          '<td class="shopping-name">' +
            '<input type="text" class="shopping-input shopping-name-input" data-id="' + item.id + '" value="' + escapeHtml(item.name) + '" placeholder="Name">' +
          '</td>' +
          '<td class="shopping-amount">' +
            '<input type="text" class="shopping-input shopping-amount-input" data-id="' + item.id + '" value="' + escapeHtml(item.amount) + '" placeholder="Menge">' +
          '</td>' +
          '<td class="actions-cell">' +
            '<button class="btn-icon btn-icon-delete delete-shopping-btn" data-id="' + item.id + '" title="Löschen"><ion-icon name="trash-outline"></ion-icon></button>' +
          '</td>';
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      body.appendChild(table);

      // "Zeile hinzufügen"-Button für jede Gruppe (inkl. "Allgemein")
      var addRow = document.createElement('div');
      addRow.className = 'shopping-add-row';
      var addBtn = document.createElement('button');
      addBtn.className = 'btn btn-primary btn-small cat-add-item-btn';
      addBtn.setAttribute('type', 'button');
      addBtn.setAttribute('data-id', catId === null ? 'null' : String(catId));
      addBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Zeile hinzufügen';
      addRow.appendChild(addBtn);
      body.appendChild(addRow);
    }
    section.appendChild(body);
    container.appendChild(section);
  });

  bindShoppingCategoryEvents(container);
}

function groupShoppingItems() {
  var groups = [];
  // "Allgemein" (ohne Kategorie) wird immer angezeigt
  var uncat = shoppingItems.filter(function (i) { return i.category_id === null || i.category_id === undefined; });
  groups.push({ category: null, items: uncat });
  shoppingCategories.forEach(function (cat) {
    var items = shoppingItems.filter(function (i) { return i.category_id == cat.id; });
    groups.push({ category: cat, items: items });
  });
  return groups;
}

function bindShoppingCategoryEvents(container) {
  // Header-Klick klappt die Kategorie auf/zu (Menü & Umbenennen sind ausgenommen)
  container.querySelectorAll('.shopping-category-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var idStr = this.getAttribute('data-id');
      var key = idStr === 'null' ? null : parseInt(idStr, 10);
      if (key !== null && renamingCategoryId === key) return;
      openCategoryMenu = null;
      collapsedCategories[key] = collapsedCategories[key] ? false : true;
      renderShoppingItems();
    });
  });

  container.querySelectorAll('.cat-menu-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var id = parseInt(this.getAttribute('data-id'), 10);
      openCategoryMenu = (openCategoryMenu === id) ? null : id;
      renderShoppingItems();
    });
  });

  container.querySelectorAll('.cat-menu-action').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var id = parseInt(this.getAttribute('data-id'), 10);
      var action = this.getAttribute('data-action');
      openCategoryMenu = null;
      renderShoppingItems();
      if (action === 'rename') {
        startCategoryRename(id);
      } else {
        var cat = shoppingCategories.find(function (c) { return c.id === id; });
        if (cat) openDeleteCategoryConfirm(cat);
      }
    });
  });

  container.querySelectorAll('.cat-add-item-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idStr = this.getAttribute('data-id');
      addShoppingCategoryItem(idStr === 'null' ? null : parseInt(idStr, 10));
    });
  });

  bindShoppingTableEvents(container);
}

function startCategoryRename(id) {
  var cat = shoppingCategories.find(function (c) { return c.id === id; });
  if (!cat) return;

  var header = document.querySelector('.shopping-category-header[data-id="' + id + '"]');
  if (!header) return;

  var nameSpan = header.querySelector('.cat-name');
  if (!nameSpan) return;

  var currentName = nameSpan.textContent;
  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'cat-rename-input';
  input.value = currentName;
  input.maxLength = 100;

  header.replaceChild(input, nameSpan);
  renamingCategoryId = id;
  input.focus();
  input.select();

  var finish = function (save) {
    var value = input.value.trim();
    renamingCategoryId = null;
    header.replaceChild(nameSpan, input);
    if (!save || !value || value === currentName) return;
    saveCategoryRename(id, value);
  };

  input.addEventListener('blur', function () { finish(true); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') input.blur();
    else if (e.key === 'Escape') finish(false);
  });
}

async function saveCategoryRename(id, newName) {
  try {
    await api.renameShoppingCategory(id, newName);
    var cat = shoppingCategories.find(function (c) { return c.id === id; });
    if (cat) cat.name = newName;
    showToast('Kategorie umbenannt.', 'success');
  } catch (err) {
    showToast('Fehler beim Umbenennen: ' + err.message, 'error');
  }
  renderShoppingItems();
}

function bindShoppingTableEvents(container) {
  container.querySelectorAll('.shopping-checkbox').forEach(function (checkbox) {
    checkbox.addEventListener('change', async function () {
      var id = parseInt(this.getAttribute('data-id'));
      var item = shoppingItems.find(function (i) { return i.id === id; });
      if (!item) return;

      var newChecked = this.checked ? 1 : 0;
      // Optimistisches Update
      item.checked = newChecked;
      renderShoppingItems();

      try {
        await api.updateShoppingItem(id, { name: item.name, amount: item.amount, checked: newChecked });
      } catch (err) {
        item.checked = newChecked ? 0 : 1;
        renderShoppingItems();
        showToast('Fehler beim Aktualisieren: ' + err.message, 'error');
      }
    });
  });

  container.querySelectorAll('.shopping-input').forEach(function (input) {
    input.addEventListener('focus', function () {
      shoppingInputFocused = true;
    });

    input.addEventListener('blur', function () {
      shoppingInputFocused = false;
      saveShoppingInput(this);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        this.blur();
      }
    });
  });

  container.querySelectorAll('.delete-shopping-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = parseInt(this.getAttribute('data-id'));
      deleteShoppingItem(id);
    });
  });
}

async function saveShoppingInput(input) {
  var id = parseInt(input.getAttribute('data-id'));
  var item = shoppingItems.find(function (i) { return i.id === id; });
  if (!item) return;

  var isName = input.classList.contains('shopping-name-input');
  var newValue = input.value.trim();

  if (isName) {
    if (!newValue) {
      // Leerer Name → Zeile behalten, damit mehrere leere Zeilen angelegt werden können
      return;
    }
    if (newValue === item.name) return;
    item.name = newValue;
  } else {
    if (!newValue) newValue = '1';
    if (newValue === item.amount) return;
    item.amount = newValue;
  }

  try {
    await api.updateShoppingItem(id, { name: item.name, amount: item.amount, checked: item.checked ? 1 : 0 });
  } catch (err) {
    showToast('Fehler beim Speichern: ' + err.message, 'error');
    await loadShoppingItems();
  }
}

async function addShoppingCategoryItem(categoryId) {
  try {
    await api.addShoppingItem('', '1', categoryId);
    await loadShoppingItems();
    // Fokus auf den neuen Namen-Input setzen
    var inputs = document.querySelectorAll('.shopping-name-input');
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus();
    }
  } catch (err) {
    showToast('Fehler beim Hinzufügen: ' + err.message, 'error');
  }
}

async function deleteShoppingItem(id) {
  try {
    await api.deleteShoppingItem(id);
    await loadShoppingItems();
  } catch (err) {
    showToast('Fehler beim Löschen: ' + err.message, 'error');
  }
}

function openAddCategoryModal() {
  document.getElementById('new-category-name').value = '';
  document.getElementById('add-category-error').classList.add('hidden');
  showModal('add-category-modal');
}

async function addCategory(name) {
  try {
    await api.addShoppingCategory(name);
    showToast('Kategorie hinzugefügt.', 'success');
    hideModal('add-category-modal');
    await loadShoppingCategories();
    await loadShoppingItems();
  } catch (err) {
    document.getElementById('add-category-error').textContent = err.message || 'Fehler beim Hinzufügen.';
    document.getElementById('add-category-error').classList.remove('hidden');
  }
}

var deleteCategoryId = null;

function openDeleteCategoryConfirm(cat) {
  deleteCategoryId = cat.id;
  document.getElementById('delete-category-name').textContent = cat.name;
  showModal('delete-category-confirm-modal');
}

async function deleteCategory() {
  if (!deleteCategoryId) return;
  var id = deleteCategoryId;
  deleteCategoryId = null;
  try {
    var result = await api.deleteShoppingCategory(id);
    hideModal('delete-category-confirm-modal');
    var msg = 'Kategorie gelöscht.';
    if (result.deleted > 0) msg += ' (' + result.deleted + ' Item(s) entfernt)';
    showToast(msg, 'success');
    await loadShoppingCategories();
    await loadShoppingItems();
  } catch (err) {
    hideModal('delete-category-confirm-modal');
    showToast('Fehler beim Löschen: ' + err.message, 'error');
    await loadShoppingCategories();
  }
}

async function clearCheckedItems() {
  try {
    var result = await api.clearCheckedShoppingItems();
    if (result.deleted > 0) {
      showToast(result.deleted + ' Item(s) gelöscht.', 'success');
    } else {
      showToast('Keine abgehakten Items vorhanden.', 'error');
    }
    await loadShoppingItems();
  } catch (err) {
    showToast('Fehler beim Löschen: ' + err.message, 'error');
  }
}

// ==================== Vorlagen ====================

function renderTemplatesList() {
  var list = document.getElementById('templates-list');
  if (!list) return;

  list.innerHTML = '';

  if (shoppingTemplates.length === 0) {
    list.innerHTML = '<p class="templates-empty">Noch keine Vorlagen vorhanden.</p>';
  } else {
    shoppingTemplates.forEach(function (template) {
      var item = document.createElement('div');
      item.className = 'template-item';
      item.innerHTML =
        '<div class="template-info">' +
          '<span class="template-name">' + escapeHtml(template.name) + '</span>' +
          '<span class="template-meta">' + template.items.length + ' Item(s)</span>' +
        '</div>' +
        '<div class="template-actions">' +
          '<button class="btn btn-primary btn-small template-apply-btn" data-id="' + template.id + '" title="Auf Einkaufsliste hinzufügen"><ion-icon name="download-outline"></ion-icon></button>' +
          '<button class="btn btn-secondary btn-small template-edit-btn" data-id="' + template.id + '" title="Bearbeiten"><ion-icon name="create-outline"></ion-icon></button>' +
          '<button class="btn btn-danger btn-small template-delete-btn" data-id="' + template.id + '" title="Löschen"><ion-icon name="trash-outline"></ion-icon></button>' +
        '</div>';
      list.appendChild(item);
    });

    list.querySelectorAll('.template-apply-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var id = parseInt(this.getAttribute('data-id'));
        await applyTemplate(id);
      });
    });

    list.querySelectorAll('.template-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(this.getAttribute('data-id'));
        var template = shoppingTemplates.find(function (t) { return t.id === id; });
        if (template) openTemplateForm(template);
      });
    });

    list.querySelectorAll('.template-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(this.getAttribute('data-id'));
        var template = shoppingTemplates.find(function (t) { return t.id === id; });
        if (template) confirmDeleteTemplate(template);
      });
    });
  }
}

async function applyTemplate(templateId) {
  if (!templateId) {
    showToast('Bitte eine Vorlage auswählen.', 'error');
    return;
  }

  try {
    await api.applyShoppingTemplate(templateId);
    showToast('Vorlage hinzugefügt.', 'success');
    await loadShoppingItems();
  } catch (err) {
    showToast('Fehler beim Anwenden der Vorlage: ' + err.message, 'error');
  }
}

function openSaveTemplateModal() {
  if (shoppingItems.length === 0) {
    showToast('Einkaufsliste ist leer – nichts zu speichern.', 'error');
    return;
  }

  document.getElementById('template-name').value = '';
  document.getElementById('save-template-error').classList.add('hidden');
  showModal('save-template-modal');
}

async function saveCurrentListAsTemplate(name) {
  var items = shoppingItems.map(function (item) {
    return { name: item.name, amount: item.amount };
  });

  try {
    await api.createShoppingTemplate(name, items);
    showToast('Vorlage gespeichert.', 'success');
    hideModal('save-template-modal');
    await loadShoppingTemplates();
  } catch (err) {
    showToast('Fehler beim Speichern der Vorlage: ' + err.message, 'error');
  }
}

// ==================== Vorlagen-Formular ====================

var editingTemplateId = null;

function openTemplateForm(template) {
  editingTemplateId = template ? template.id : null;

  document.getElementById('template-form-title').textContent = template ? 'Vorlage bearbeiten' : 'Neue Vorlage';
  document.getElementById('template-id').value = template ? template.id : '';
  document.getElementById('template-form-name').value = template ? template.name : '';
  document.getElementById('template-form-error').classList.add('hidden');

  var itemsList = document.getElementById('template-items-list');
  itemsList.innerHTML = '';

  var items = template ? template.items : [{ name: '', amount: '1' }];
  items.forEach(function (item) {
    addTemplateItemRow(item.name, item.amount);
  });

  showModal('template-form-modal');
}

function addTemplateItemRow(name, amount) {
  var itemsList = document.getElementById('template-items-list');
  var row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML =
    '<input type="text" class="template-item-name" placeholder="Item-Name" value="' + escapeHtml(name || '') + '" required>' +
    '<input type="text" class="template-item-amount" placeholder="Menge" value="' + escapeHtml(amount || '1') + '" required>' +
    '<button type="button" class="btn-remove-ingredient" title="Item entfernen">✕</button>';

  row.querySelector('.btn-remove-ingredient').addEventListener('click', function () {
    var rows = itemsList.querySelectorAll('.ingredient-row');
    if (rows.length > 1) {
      row.remove();
    } else {
      showToast('Mindestens ein Item ist erforderlich.', 'error');
    }
  });

  itemsList.appendChild(row);
}

function getTemplateFormItems() {
  var rows = document.querySelectorAll('#template-items-list .ingredient-row');
  var items = [];
  rows.forEach(function (row, index) {
    var nameInput = row.querySelector('.template-item-name');
    var amountInput = row.querySelector('.template-item-amount');
    items.push({
      name: nameInput.value.trim(),
      amount: amountInput.value.trim() || '1',
      sort_order: index,
    });
  });
  return items;
}

function confirmDeleteTemplate(template) {
  deleteTemplateId = template.id;
  document.getElementById('delete-template-name').textContent = template.name;
  showModal('delete-template-confirm-modal');
}

var deleteTemplateId = null;

async function deleteTemplate(id) {
  try {
    await api.deleteShoppingTemplate(id);
    showToast('Vorlage gelöscht.', 'success');
    hideModal('delete-template-confirm-modal');
    await loadShoppingTemplates();
  } catch (err) {
    showToast('Fehler beim Löschen der Vorlage: ' + err.message, 'error');
  }
}

// ==================== Wochenplan → Einkaufsliste ====================

async function addWeeklyPlanToShoppingList() {
  if (weeklyPlan.length === 0) {
    showToast('Kein Wochenplan vorhanden.', 'error');
    return;
  }

  var items = [];
  weeklyPlan.forEach(function (planItem) {
    planItem.meal.ingredients.forEach(function (ing) {
      var packages = calculatePackages(ing.package_count, planItem.meal.standard_portions, planItem.portions);
      items.push({
        name: ing.name,
        amount: String(packages),
      });
    });
  });

  if (items.length === 0) {
    showToast('Keine Zutaten vorhanden.', 'error');
    return;
  }

  try {
    await api.addShoppingItemsFromMeals(items);
    showToast(items.length + ' Zutaten zur Einkaufsliste hinzugefügt.', 'success');
  } catch (err) {
    showToast('Fehler beim Hinzufügen: ' + err.message, 'error');
  }
}

// ==================== Einkaufsliste Init ====================

function startShoppingPolling() {
  if (shoppingPollTimer) return;
  shoppingPollTimer = setInterval(async function () {
    if (!shoppingPollActive) return;
    try {
      var items = await api.getShoppingItems();
      var cats = await api.getShoppingCategories();
      var itemsChanged = items.length !== shoppingItems.length ||
        items.some(function (item, index) {
          var current = shoppingItems[index];
          return !current ||
            current.id !== item.id ||
            current.name !== item.name ||
            current.amount !== item.amount ||
            current.checked !== item.checked;
        });
      var catsChanged = cats.length !== shoppingCategories.length ||
        cats.some(function (cat, index) {
          var current = shoppingCategories[index];
          return !current || current.id !== cat.id || current.name !== cat.name;
        });
      if ((itemsChanged || catsChanged) && !shoppingInputFocused) {
        shoppingItems = items;
        shoppingCategories = cats;
        renderShoppingItems();
      }
      setSyncIndicator('ok');
    } catch (err) {
      setSyncIndicator('error');
    }
  }, 3000);
}

function stopShoppingPolling() {
  if (shoppingPollTimer) {
    clearInterval(shoppingPollTimer);
    shoppingPollTimer = null;
  }
}

function initShoppingList() {
  // Neue Kategorie
  document.getElementById('add-category-btn').addEventListener('click', function () {
    openAddCategoryModal();
  });

  document.getElementById('cancel-add-category-btn').addEventListener('click', function () {
    hideModal('add-category-modal');
  });

  document.getElementById('add-category-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = document.getElementById('new-category-name').value.trim();
    if (!name) {
      document.getElementById('add-category-error').textContent = 'Name ist erforderlich.';
      document.getElementById('add-category-error').classList.remove('hidden');
      return;
    }
    await addCategory(name);
  });

  // Kategorie löschen
  document.getElementById('confirm-delete-category-btn').addEventListener('click', function () {
    if (!deleteCategoryId) return;
    deleteCategory();
  });

  document.getElementById('cancel-delete-category-btn').addEventListener('click', function () {
    hideModal('delete-category-confirm-modal');
    deleteCategoryId = null;
  });

  document.getElementById('clear-checked-btn').addEventListener('click', function () {
    clearCheckedItems();
  });

  document.getElementById('save-as-template-btn').addEventListener('click', function () {
    openSaveTemplateModal();
  });

  document.getElementById('manage-templates-btn').addEventListener('click', function () {
    renderTemplatesList();
    showModal('manage-templates-modal');
  });

  // Save template modal
  document.getElementById('save-template-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = document.getElementById('template-name').value.trim();
    if (!name) {
      document.getElementById('save-template-error').textContent = 'Name ist erforderlich.';
      document.getElementById('save-template-error').classList.remove('hidden');
      return;
    }
    await saveCurrentListAsTemplate(name);
  });

  document.getElementById('cancel-save-template-btn').addEventListener('click', function () {
    hideModal('save-template-modal');
  });

  // Manage templates modal
  document.getElementById('close-manage-templates-btn').addEventListener('click', function () {
    hideModal('manage-templates-modal');
  });

  var addTemplateBtn = document.getElementById('add-template-btn');
  if (addTemplateBtn) {
    addTemplateBtn.addEventListener('click', function () {
      hideModal('manage-templates-modal');
      openTemplateForm(null);
    });
  }

  // Template form modal
  document.getElementById('add-template-item-btn').addEventListener('click', function () {
    addTemplateItemRow('', '1');
  });

  document.getElementById('cancel-template-form-btn').addEventListener('click', function () {
    hideModal('template-form-modal');
  });

  document.getElementById('template-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var errorDiv = document.getElementById('template-form-error');
    errorDiv.classList.add('hidden');

    var name = document.getElementById('template-form-name').value.trim();
    var items = getTemplateFormItems();

    var errors = [];
    if (!name) errors.push('Name ist erforderlich.');
    if (items.length === 0) errors.push('Mindestens ein Item ist erforderlich.');
    items.forEach(function (item, i) {
      if (!item.name) errors.push('Item ' + (i + 1) + ': Name ist erforderlich.');
    });

    if (errors.length > 0) {
      errorDiv.innerHTML = errors.join('<br>');
      errorDiv.classList.remove('hidden');
      return;
    }

    try {
      if (editingTemplateId) {
        await api.updateShoppingTemplate(editingTemplateId, name, items);
        showToast('Vorlage aktualisiert.', 'success');
      } else {
        await api.createShoppingTemplate(name, items);
        showToast('Vorlage erstellt.', 'success');
      }
      hideModal('template-form-modal');
      await loadShoppingTemplates();
    } catch (err) {
      errorDiv.textContent = err.message || 'Fehler beim Speichern.';
      errorDiv.classList.remove('hidden');
    }
  });

  // Delete template confirm modal
  document.getElementById('confirm-delete-template-btn').addEventListener('click', function () {
    if (!deleteTemplateId) return;
    var id = deleteTemplateId;
    deleteTemplateId = null;
    deleteTemplate(id);
  });

  document.getElementById('cancel-delete-template-btn').addEventListener('click', function () {
    hideModal('delete-template-confirm-modal');
    deleteTemplateId = null;
  });
}

// ==================== App-Initialisierung ====================

function showLogin() {
  stopShoppingPolling();
  shoppingPollActive = false;
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('app-page').classList.add('hidden');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('login-error').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app-page').classList.remove('hidden');
  loadMeals();

  // Einkaufsliste-Polling starten
  shoppingPollActive = true;
  startShoppingPolling();
}

async function checkSession() {
  try {
    var session = await api.checkSession();
    if (session.authenticated) {
      showApp();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
}

// ==================== Start ====================

document.addEventListener('DOMContentLoaded', function () {
  initLogin();
  initNavigation();
  initMealsTab();
  initMealForm();
  initDeleteConfirm();
  initWeeklyPlan();
  initShoppingList();
  checkSession();
});
