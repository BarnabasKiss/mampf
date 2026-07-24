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

// ==================== App-Initialisierung ====================

function showLogin() {
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
  checkSession();
});