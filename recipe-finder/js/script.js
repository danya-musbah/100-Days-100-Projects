'use strict';

/* ============================================================
   Recipe Finder
   Data source: TheMealDB (https://www.themealdb.com/api.php)
   Free, keyless, CORS-enabled test API — no credentials needed.
   ============================================================ */

const API_BASE = 'https://www.themealdb.com/api/json/v1/1';

const STORAGE_KEYS = {
  favorites: 'recipeFinder_favorites',
  recentSearches: 'recipeFinder_recentSearches'
};

const PAGE_SIZE = 12;
const SUGGESTION_LIMIT = 6;
const SEED_SUGGESTIONS = [
  'Chicken pasta', 'Chocolate cake', 'Vegetarian curry',
  'Caesar salad', 'Pancakes', 'Pizza'
];

/* ---------------- state ---------------- */
const state = {
  allRecipes: [],            // full corpus, normalized (loaded once)
  recipesById: new Map(),    // id -> normalized recipe (grows as details are fetched)
  searchResultsCache: null,  // results for the current query, or null when browsing corpus
  ingredientFallback: false, // true when the last search matched by ingredient, not name
  currentQuery: '',
  activeCategory: 'All',
  activeCuisines: [],
  activeDietary: [],
  pendingCuisines: [],
  pendingDietary: [],
  sortMode: 'relevance',
  filteredResults: [],
  renderedCount: 0,
  favorites: {},             // id -> normalized recipe
  recentSearches: [],
  currentView: 'home',
  lastFocusedEl: null
};

/* ---------------- DOM refs ---------------- */
const el = {
  menuToggle: document.getElementById('menuToggle'),
  mobileMenu: document.getElementById('mobileMenu'),
  favCount: document.getElementById('favCount'),
  favCountMobile: document.getElementById('favCountMobile'),

  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  clearBtn: document.getElementById('clearBtn'),
  searchBtn: document.getElementById('searchBtn'),
  suggestionsList: document.getElementById('suggestionsList'),
  recentSearches: document.getElementById('recentSearches'),
  recentChipRow: document.getElementById('recentChipRow'),
  clearRecentBtn: document.getElementById('clearRecentBtn'),

  categoriesRow: document.getElementById('categoriesRow'),

  filterBtn: document.getElementById('filterBtn'),
  filterBadge: document.getElementById('filterBadge'),
  resultsCount: document.getElementById('resultsCount'),
  sortSelect: document.getElementById('sortSelect'),
  activeFilters: document.getElementById('activeFilters'),

  recipeGrid: document.getElementById('recipeGrid'),
  emptyState: document.getElementById('emptyState'),
  errorState: document.getElementById('errorState'),
  retryBtn: document.getElementById('retryBtn'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),

  viewHome: document.getElementById('view-home'),
  viewFavorites: document.getElementById('view-favorites'),
  favoritesGrid: document.getElementById('favoritesGrid'),
  favEmptyState: document.getElementById('favEmptyState'),
  favSubtitle: document.getElementById('favSubtitle'),
  exploreFromFavBtn: document.getElementById('exploreFromFavBtn'),

  modalBackdrop: document.getElementById('modalBackdrop'),
  recipeModal: document.getElementById('recipeModal'),
  modalScroll: document.getElementById('modalScroll'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),

  drawerBackdrop: document.getElementById('drawerBackdrop'),
  filterDrawer: document.getElementById('filterDrawer'),
  drawerCloseBtn: document.getElementById('drawerCloseBtn'),
  cuisineOptions: document.getElementById('cuisineOptions'),
  dietaryOptions: document.getElementById('dietaryOptions'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  applyFiltersBtn: document.getElementById('applyFiltersBtn'),

  toast: document.getElementById('toast'),

  recipeCardTemplate: document.getElementById('recipeCardTemplate'),
  skeletonCardTemplate: document.getElementById('skeletonCardTemplate')
};

let toastTimer = null;
let suggestionIndex = -1;

/* ============================================================
   Utilities
   ============================================================ */
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    return parsed == null ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  el.toast.textContent = message;
  el.toast.hidden = false;
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2200);
}

/* ============================================================
   Normalization — map TheMealDB's shape to our internal shape
   ============================================================ */
function normalizeMeal(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim()) {
      ingredients.push({ name: name.trim(), measure: (measure || '').trim() });
    }
  }

  const tags = (meal.strTags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  return {
    id: meal.idMeal,
    name: meal.strMeal || 'Untitled recipe',
    thumb: meal.strMealThumb || '',
    category: meal.strCategory || '',
    area: meal.strArea || '',
    tags,
    ingredients,
    instructions: meal.strInstructions || '',
    source: meal.strSource || '',
    youtube: meal.strYoutube || '',
    hasFullDetails: Boolean(meal.strInstructions)
  };
}

function normalizeStub(item) {
  // filter.php results only carry id / name / thumbnail
  return {
    id: item.idMeal,
    name: item.strMeal || 'Untitled recipe',
    thumb: item.strMealThumb || '',
    category: '',
    area: '',
    tags: [],
    ingredients: [],
    instructions: '',
    source: '',
    youtube: '',
    hasFullDetails: false
  };
}

/* ============================================================
   API layer
   ============================================================ */
async function fetchRecipes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API responded with ${res.status}`);
  const data = await res.json();
  return data;
}

async function searchRecipes(query) {
  const url = `${API_BASE}/search.php?s=${encodeURIComponent(query)}`;
  const data = await fetchRecipes(url);
  return Array.isArray(data.meals) ? data.meals.map(normalizeMeal) : [];
}

async function searchByIngredient(query) {
  const url = `${API_BASE}/filter.php?i=${encodeURIComponent(query)}`;
  const data = await fetchRecipes(url);
  return Array.isArray(data.meals) ? data.meals.map(normalizeStub) : [];
}

async function fetchRecipeDetails(id) {
  const cached = state.recipesById.get(id);
  if (cached && cached.hasFullDetails) return cached;

  const url = `${API_BASE}/lookup.php?i=${encodeURIComponent(id)}`;
  const data = await fetchRecipes(url);
  const meal = Array.isArray(data.meals) && data.meals[0];
  if (!meal) return cached || null;

  const full = normalizeMeal(meal);
  state.recipesById.set(id, full);
  return full;
}

async function fetchCategories() {
  const data = await fetchRecipes(`${API_BASE}/categories.php`);
  return Array.isArray(data.categories) ? data.categories.map(c => c.strCategory) : [];
}

async function fetchAreas() {
  const data = await fetchRecipes(`${API_BASE}/list.php?a=list`);
  return Array.isArray(data.meals) ? data.meals.map(m => m.strArea).filter(Boolean) : [];
}

/* ============================================================
   Persistence
   ============================================================ */
function loadFavorites() {
  const raw = localStorage.getItem(STORAGE_KEYS.favorites);
  state.favorites = safeParse(raw, {}) || {};
  if (typeof state.favorites !== 'object' || Array.isArray(state.favorites)) {
    state.favorites = {};
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(state.favorites));
  } catch (e) { /* storage unavailable — fail silently, app still works this session */ }
}

function loadRecentSearches() {
  const raw = localStorage.getItem(STORAGE_KEYS.recentSearches);
  const parsed = safeParse(raw, []);
  state.recentSearches = Array.isArray(parsed) ? parsed.slice(0, 8) : [];
}

function saveRecentSearch(query) {
  const q = query.trim();
  if (!q) return;
  state.recentSearches = [q, ...state.recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 8);
  try {
    localStorage.setItem(STORAGE_KEYS.recentSearches, JSON.stringify(state.recentSearches));
  } catch (e) { /* ignore */ }
  renderRecentSearches();
}

function clearRecentSearches() {
  state.recentSearches = [];
  try { localStorage.removeItem(STORAGE_KEYS.recentSearches); } catch (e) { /* ignore */ }
  renderRecentSearches();
}

/* ============================================================
   Favorites
   ============================================================ */
function toggleFavorite(recipe, btnEl) {
  const isFav = Boolean(state.favorites[recipe.id]);
  if (isFav) {
    delete state.favorites[recipe.id];
  } else {
    state.favorites[recipe.id] = {
      id: recipe.id, name: recipe.name, thumb: recipe.thumb,
      category: recipe.category, area: recipe.area, tags: recipe.tags
    };
  }
  saveFavorites();
  updateFavCount();

  document.querySelectorAll(`[data-recipe-id="${CSS.escape(recipe.id)}"] .fav-btn`).forEach(b => {
    b.classList.toggle('is-active', !isFav);
    b.setAttribute('aria-label', !isFav ? 'Remove from favorites' : 'Save to favorites');
  });
  document.querySelectorAll(`.action-fav[data-recipe-id="${CSS.escape(recipe.id)}"]`).forEach(b => {
    b.classList.toggle('is-active', !isFav);
    const label = b.childNodes[b.childNodes.length - 1];
    if (label && label.nodeType === Node.TEXT_NODE) {
      label.textContent = !isFav ? ' Saved' : ' Save Recipe';
    }
    const heartPath = b.querySelector('svg path');
    if (heartPath) heartPath.setAttribute('fill', !isFav ? 'currentColor' : 'none');
  });

  if (btnEl) {
    btnEl.classList.remove('pulse');
    void btnEl.offsetWidth;
    btnEl.classList.add('pulse');
  }

  if (state.currentView === 'favorites') renderFavorites();
}

function updateFavCount() {
  const count = Object.keys(state.favorites).length;
  el.favCount.textContent = String(count);
  el.favCountMobile.textContent = String(count);
  el.favCount.setAttribute('aria-label', `${count} favorites`);
}

/* ============================================================
   Rendering — recipe cards
   ============================================================ */
function buildTagsMarkup(recipe) {
  const chips = [];
  if (recipe.area) chips.push(`<span class="card-tag tag-sky">${escapeHtml(recipe.area)}</span>`);
  if (recipe.category === 'Vegetarian' || recipe.category === 'Vegan') {
    chips.push(`<span class="card-tag">${escapeHtml(recipe.category)}</span>`);
  }
  return chips.join('');
}

function renderRecipeCard(recipe) {
  const node = el.recipeCardTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.recipeId = recipe.id;

  const img = node.querySelector('.card-img');
  img.src = recipe.thumb || '';
  img.alt = recipe.name;
  img.onerror = () => {
    img.onerror = null;
    img.src = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23FFDE96"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="%232B2118" text-anchor="middle" dominant-baseline="middle">Image unavailable</text></svg>'
    );
  };

  node.querySelector('.card-title').textContent = recipe.name;
  node.querySelector('.card-meta').textContent = recipe.category
    ? recipe.category
    : (state.ingredientFallback ? 'Ingredient match' : '');
  node.querySelector('.card-tags').innerHTML = buildTagsMarkup(recipe);

  const favBtn = node.querySelector('.fav-btn');
  const isFav = Boolean(state.favorites[recipe.id]);
  favBtn.classList.toggle('is-active', isFav);
  favBtn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Save to favorites');
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(recipe, favBtn);
  });

  node.addEventListener('click', () => openRecipeDetails(recipe.id));
  node.setAttribute('tabindex', '0');
  node.setAttribute('role', 'button');
  node.setAttribute('aria-label', `View recipe: ${recipe.name}`);
  node.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRecipeDetails(recipe.id); }
  });

  return node;
}

function renderSkeletons(count) {
  el.recipeGrid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    el.recipeGrid.appendChild(el.skeletonCardTemplate.content.firstElementChild.cloneNode(true));
  }
}

/* ============================================================
   Results pipeline: filter -> sort -> paginate -> render
   ============================================================ */
function currentBaseline() {
  return state.searchResultsCache !== null ? state.searchResultsCache : state.allRecipes;
}

function computeFilteredResults() {
  let list = currentBaseline().slice();

  if (state.activeCategory !== 'All') {
    list = list.filter(r => r.category === state.activeCategory);
  }
  if (state.activeCuisines.length) {
    list = list.filter(r => state.activeCuisines.includes(r.area));
  }
  if (state.activeDietary.length) {
    list = list.filter(r => state.activeDietary.includes(r.category));
  }

  list = sortRecipes(list, state.sortMode);

  state.filteredResults = list;
  state.renderedCount = 0;
  el.recipeGrid.innerHTML = '';
  renderResultsPage();
  updateResultsMeta();
}

function sortRecipes(list, mode) {
  const sorted = list.slice();
  if (mode === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (mode === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name));
  return sorted; // 'relevance' keeps API/corpus order
}

function renderResultsPage() {
  const next = state.filteredResults.slice(state.renderedCount, state.renderedCount + PAGE_SIZE);
  const frag = document.createDocumentFragment();
  next.forEach(recipe => frag.appendChild(renderRecipeCard(recipe)));
  el.recipeGrid.appendChild(frag);
  state.renderedCount += next.length;

  const hasMore = state.renderedCount < state.filteredResults.length;
  el.loadMoreBtn.hidden = !hasMore;

  const isEmpty = state.filteredResults.length === 0;
  el.emptyState.hidden = !isEmpty;
  el.recipeGrid.hidden = isEmpty;
}

function updateResultsMeta() {
  const n = state.filteredResults.length;
  el.resultsCount.textContent = `${n} recipe${n === 1 ? '' : 's'} found`;
  renderActiveFilterChips();
  const badgeCount = state.activeCuisines.length + state.activeDietary.length;
  el.filterBadge.hidden = badgeCount === 0;
  el.filterBadge.textContent = String(badgeCount);
}

function renderActiveFilterChips() {
  const chips = [];
  if (state.activeCategory !== 'All') {
    chips.push({ label: state.activeCategory, onRemove: () => handleCategoryFilter('All') });
  }
  state.activeCuisines.forEach(c => chips.push({
    label: c,
    onRemove: () => {
      state.activeCuisines = state.activeCuisines.filter(x => x !== c);
      state.pendingCuisines = state.activeCuisines.slice();
      syncDrawerCheckboxes();
      computeFilteredResults();
    }
  }));
  state.activeDietary.forEach(d => chips.push({
    label: d,
    onRemove: () => {
      state.activeDietary = state.activeDietary.filter(x => x !== d);
      state.pendingDietary = state.activeDietary.slice();
      syncDrawerCheckboxes();
      computeFilteredResults();
    }
  }));

  el.activeFilters.innerHTML = '';
  el.activeFilters.hidden = chips.length === 0;
  chips.forEach(chip => {
    const span = document.createElement('span');
    span.className = 'active-filter-chip';
    span.innerHTML = `${escapeHtml(chip.label)} <button type="button" aria-label="Remove ${escapeHtml(chip.label)} filter"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`;
    span.querySelector('button').addEventListener('click', chip.onRemove);
    el.activeFilters.appendChild(span);
  });
}

/* ============================================================
   States
   ============================================================ */
function showLoading() {
  el.errorState.hidden = true;
  el.emptyState.hidden = true;
  el.loadMoreBtn.hidden = true;
  el.recipeGrid.hidden = false;
  el.resultsCount.textContent = 'Loading recipes\u2026';
  renderSkeletons(8);
}

function showError() {
  el.recipeGrid.hidden = true;
  el.emptyState.hidden = true;
  el.loadMoreBtn.hidden = true;
  el.errorState.hidden = false;
  el.resultsCount.textContent = '';
}

function showEmptyState() {
  el.recipeGrid.hidden = true;
  el.errorState.hidden = true;
  el.emptyState.hidden = false;
}

/* ============================================================
   Search flow
   ============================================================ */
async function handleSearch(rawQuery) {
  const query = rawQuery.trim();
  hideSuggestions();

  if (!query) {
    state.currentQuery = '';
    state.searchResultsCache = null;
    state.ingredientFallback = false;
    updateUrlQuery('');
    computeFilteredResults();
    return;
  }

  el.searchBtn.classList.add('is-loading');
  el.searchBtn.querySelector('.search-btn-spinner').hidden = false;
  showLoading();

  try {
    let results = await searchRecipes(query);
    state.ingredientFallback = false;

    if (results.length === 0) {
      const ingredientMatches = await searchByIngredient(query);
      if (ingredientMatches.length > 0) {
        results = ingredientMatches;
        state.ingredientFallback = true;
      }
    }

    results.forEach(r => {
      if (!state.recipesById.has(r.id) || r.hasFullDetails) state.recipesById.set(r.id, r);
    });

    state.currentQuery = query;
    state.searchResultsCache = results;
    updateUrlQuery(query);
    saveRecentSearch(query);
    computeFilteredResults();
  } catch (err) {
    showError();
  } finally {
    el.searchBtn.classList.remove('is-loading');
    el.searchBtn.querySelector('.search-btn-spinner').hidden = true;
  }
}

function updateUrlQuery(query) {
  const url = new URL(window.location.href);
  if (query) url.searchParams.set('search', query);
  else url.searchParams.delete('search');
  window.history.pushState({ search: query }, '', url);
}

function handleCategoryFilter(category) {
  state.activeCategory = category;
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.toggle('is-active', pill.dataset.category === category);
    pill.setAttribute('aria-pressed', String(pill.dataset.category === category));
  });
  computeFilteredResults();
}

function syncDrawerCheckboxes() {
  el.filterDrawer.querySelectorAll('input[name="cuisine"]').forEach(box => {
    box.checked = state.pendingCuisines.includes(box.value);
    box.closest('.filter-pill').classList.toggle('is-checked', box.checked);
  });
  el.filterDrawer.querySelectorAll('input[name="dietary"]').forEach(box => {
    box.checked = state.pendingDietary.includes(box.value);
    box.closest('.filter-pill').classList.toggle('is-checked', box.checked);
  });
}

function handleAdvancedFilters() {
  state.pendingCuisines = Array.from(el.filterDrawer.querySelectorAll('input[name="cuisine"]:checked')).map(i => i.value);
  state.pendingDietary = Array.from(el.filterDrawer.querySelectorAll('input[name="dietary"]:checked')).map(i => i.value);
  state.activeCuisines = state.pendingCuisines.slice();
  state.activeDietary = state.pendingDietary.slice();
  closeFilterDrawer();
  computeFilteredResults();
}

/* ============================================================
   Suggestions
   ============================================================ */
function getSuggestions(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const fromData = state.allRecipes
    .filter(r => r.name.toLowerCase().includes(q))
    .map(r => r.name);
  const fromSeed = SEED_SUGGESTIONS.filter(s => s.toLowerCase().includes(q));
  const merged = [...new Set([...fromData, ...fromSeed])];
  return merged.slice(0, SUGGESTION_LIMIT);
}

function renderSuggestions(list) {
  suggestionIndex = -1;
  if (list.length === 0) { hideSuggestions(); return; }
  el.suggestionsList.innerHTML = list.map((s, i) =>
    `<li role="option" id="suggestion-${i}" data-value="${escapeHtml(s)}">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" width="16" height="16"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none"/><path d="M20 20l-3.2-3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      ${escapeHtml(s)}
    </li>`).join('');
  el.suggestionsList.hidden = false;
  el.searchInput.setAttribute('aria-expanded', 'true');

  el.suggestionsList.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      el.searchInput.value = li.dataset.value;
      handleSearch(li.dataset.value);
    });
  });
}

function hideSuggestions() {
  el.suggestionsList.hidden = true;
  el.suggestionsList.innerHTML = '';
  el.searchInput.setAttribute('aria-expanded', 'false');
  suggestionIndex = -1;
}

const debouncedSuggest = debounce((value) => {
  if (!value.trim()) { hideSuggestions(); return; }
  renderSuggestions(getSuggestions(value));
}, 220);

/* ============================================================
   Recent searches UI
   ============================================================ */
function renderRecentSearches() {
  el.recentSearches.hidden = state.recentSearches.length === 0;
  el.recentChipRow.innerHTML = state.recentSearches.map(s =>
    `<button type="button" class="chip-btn" data-recent="${escapeHtml(s)}">${escapeHtml(s)}</button>`
  ).join('');
  el.recentChipRow.querySelectorAll('[data-recent]').forEach(btn => {
    btn.addEventListener('click', () => {
      el.searchInput.value = btn.dataset.recent;
      handleSearch(btn.dataset.recent);
    });
  });
}

/* ============================================================
   Categories row
   ============================================================ */
const CATEGORY_ICON_FALLBACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v18M6 3c0 3 3 3 3 6s-3 3-3 6M18 3v18M15 3v7a3 3 0 0 0 3 3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function renderCategoryPills(categories) {
  const all = ['All', ...categories];
  el.categoriesRow.innerHTML = all.map(cat => `
    <button type="button" class="category-pill${cat === 'All' ? ' is-active' : ''}" data-category="${escapeHtml(cat)}" aria-pressed="${cat === 'All'}">
      ${CATEGORY_ICON_FALLBACK}
      <span>${escapeHtml(cat)}</span>
    </button>
  `).join('');

  el.categoriesRow.querySelectorAll('.category-pill').forEach(pill => {
    pill.addEventListener('click', () => handleCategoryFilter(pill.dataset.category));
  });
}

function renderCuisineOptions(areas) {
  el.cuisineOptions.innerHTML = areas.map(area => `
    <label class="filter-pill">
      <input type="checkbox" name="cuisine" value="${escapeHtml(area)}">
      <span>${escapeHtml(area)}</span>
    </label>
  `).join('');
}

/* ============================================================
   Recipe details modal
   ============================================================ */
function parseInstructionSteps(text) {
  if (!text) return [];
  let steps = text.split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
  if (steps.length <= 1) {
    steps = text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map(s => s.trim()).filter(Boolean);
  }
  return steps.map(s => s.replace(/^(step\s*\d+[:.\-\)]?\s*|\d+[:.\-\)]\s*)/i, '').trim()).filter(Boolean);
}

function metaChip(iconPath, label) {
  return `<span class="modal-meta-item"><svg viewBox="0 0 24 24" aria-hidden="true">${iconPath}</svg>${escapeHtml(label)}</span>`;
}

async function openRecipeDetails(id) {
  state.lastFocusedEl = document.activeElement;
  el.modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  el.modalScroll.innerHTML = `<div class="state-panel" style="padding:90px 20px;"><div class="skeleton-line skeleton-line-lg" style="margin:0 auto 10px;width:60%"></div><div class="skeleton-line skeleton-line-sm" style="margin:0 auto;width:40%"></div></div>`;
  el.modalCloseBtn.focus();

  let recipe = state.recipesById.get(id);
  try {
    if (!recipe || !recipe.hasFullDetails) {
      recipe = await fetchRecipeDetails(id);
    }
  } catch (err) {
    el.modalScroll.innerHTML = `<div class="state-panel"><h3>Couldn't load this recipe</h3><p>Please check your connection and try again.</p></div>`;
    return;
  }

  if (!recipe) {
    el.modalScroll.innerHTML = `<div class="state-panel"><h3>Recipe unavailable</h3><p>We couldn't find details for this recipe.</p></div>`;
    return;
  }

  renderRecipeModal(recipe);
}

function renderRecipeModal(recipe) {
  const isFav = Boolean(state.favorites[recipe.id]);
  const steps = parseInstructionSteps(recipe.instructions);

  const metaChips = [];
  if (recipe.category) metaChips.push(metaChip('<path d="M4 4h16v4H4zM6 8v12h12V8" fill="none" stroke="currentColor" stroke-width="1.7"/>', recipe.category));
  if (recipe.area) metaChips.push(metaChip('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 12h18M12 3c2.5 2.5 3.8 6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-6-3.8-9s1.3-6.5 3.8-9Z" fill="none" stroke="currentColor" stroke-width="1.4"/>', recipe.area));
  recipe.tags.forEach(t => metaChips.push(metaChip('<path d="M20.6 12.6 12.6 20.6a2 2 0 0 1-2.8 0l-6.4-6.4a2 2 0 0 1 0-2.8L11.4 3.4A2 2 0 0 1 12.8 3H19a2 2 0 0 1 2 2v6.2a2 2 0 0 1-.4 1.4Z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/>', t)));

  const ingredientsHtml = recipe.ingredients.length
    ? recipe.ingredients.map((ing, i) => `
      <label class="ingredient-item">
        <input type="checkbox" id="ing-${i}">
        <span class="ingredient-check"><svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span class="ingredient-text">${escapeHtml(ing.measure)} ${escapeHtml(ing.name)}</span>
      </label>
    `).join('')
    : `<p style="color:var(--ink-faint);font-size:.9rem;">Ingredient list not available for this recipe.</p>`;

  const stepsHtml = steps.length
    ? steps.map((s, i) => `
      <div class="step-item">
        <span class="step-num">${String(i + 1).padStart(2, '0')}</span>
        <p class="step-text">${escapeHtml(s)}</p>
      </div>
    `).join('')
    : `<p style="color:var(--ink-faint);font-size:.9rem;">Instructions not available for this recipe.</p>`;

  const links = [];
  if (recipe.source) links.push(`<a class="modal-source-link" href="${escapeHtml(recipe.source)}" target="_blank" rel="noopener noreferrer">View Original Recipe <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`);
  if (recipe.youtube) links.push(`<a class="modal-source-link" href="${escapeHtml(recipe.youtube)}" target="_blank" rel="noopener noreferrer">Watch Video <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`);

  el.modalScroll.innerHTML = `
    <div class="modal-hero"><img src="${escapeHtml(recipe.thumb)}" alt="${escapeHtml(recipe.name)}"></div>
    <div class="modal-body">
      <h2 class="modal-title" id="modalTitle">${escapeHtml(recipe.name)}</h2>
      <div class="modal-meta-row">${metaChips.join('')}</div>

      <div class="modal-actions">
        <button class="action-btn action-fav${isFav ? ' is-active' : ''}" data-recipe-id="${escapeHtml(recipe.id)}" id="modalFavBtn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-9.3-8.7C1.1 8 2.5 4.8 5.7 4.1 8 3.6 10 4.7 12 7c2-2.3 4-3.4 6.3-2.9 3.2.7 4.6 3.9 3 7.2C19 15.6 12 20 12 20Z" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6"/></svg>
          ${isFav ? 'Saved' : 'Save Recipe'}
        </button>
        <button class="action-btn" id="modalShareBtn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="6" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="19" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6" stroke="currentColor" stroke-width="1.6"/></svg>
          Share Recipe
        </button>
        <button class="action-btn" id="modalCopyBtn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
          Copy Ingredients
        </button>
        ${links.join('')}
      </div>

      <div class="modal-section">
        <h3>Ingredients</h3>
        <div class="ingredient-list">${ingredientsHtml}</div>
      </div>

      <div class="modal-section">
        <h3>Instructions</h3>
        <div class="steps-list">${stepsHtml}</div>
      </div>
    </div>
  `;

  document.getElementById('modalFavBtn').addEventListener('click', (e) => toggleFavorite(recipe, e.currentTarget));
  document.getElementById('modalShareBtn').addEventListener('click', () => shareRecipe(recipe));
  document.getElementById('modalCopyBtn').addEventListener('click', () => copyIngredients(recipe));
}

function closeRecipeDetails() {
  el.modalBackdrop.hidden = true;
  el.modalScroll.innerHTML = '';
  document.body.style.overflow = '';
  if (state.lastFocusedEl) state.lastFocusedEl.focus();
}

/* ============================================================
   Share / copy
   ============================================================ */
async function shareRecipe(recipe) {
  const shareUrl = recipe.source || recipe.youtube || window.location.href;
  const shareData = {
    title: recipe.name,
    text: `Check out this recipe for ${recipe.name} on Recipe Finder.`,
    url: shareUrl
  };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch (e) { /* user cancelled */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(shareUrl);
    showToast('Copied!');
  } catch (e) {
    showToast('Unable to copy link');
  }
}

async function copyIngredients(recipe) {
  if (!recipe.ingredients.length) { showToast('No ingredients to copy'); return; }
  const text = recipe.ingredients.map(i => `${i.measure} ${i.name}`.trim()).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied!');
  } catch (e) {
    showToast('Unable to copy ingredients');
  }
}

/* ============================================================
   Favorites view
   ============================================================ */
function renderFavorites() {
  const favs = Object.values(state.favorites);
  el.favSubtitle.textContent = favs.length
    ? `${favs.length} recipe${favs.length === 1 ? '' : 's'} saved`
    : '';
  el.favoritesGrid.innerHTML = '';
  el.favoritesGrid.hidden = favs.length === 0;
  el.favEmptyState.hidden = favs.length !== 0;
  favs.forEach(recipe => el.favoritesGrid.appendChild(renderRecipeCard(recipe)));
}

/* ============================================================
   View switching
   ============================================================ */
function switchView(view) {
  state.currentView = view;
  el.viewHome.hidden = view !== 'home';
  el.viewFavorites.hidden = view !== 'favorites';

  document.querySelectorAll('[data-nav]').forEach(btn => {
    if (btn.dataset.nav === view) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  if (view === 'favorites') renderFavorites();
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

/* ============================================================
   Filter drawer
   ============================================================ */
function openFilterDrawer() {
  state.pendingCuisines = state.activeCuisines.slice();
  state.pendingDietary = state.activeDietary.slice();
  syncDrawerCheckboxes();
  el.drawerBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  el.drawerCloseBtn.focus();
}
function closeFilterDrawer() {
  el.drawerBackdrop.hidden = true;
  document.body.style.overflow = '';
  el.filterBtn.focus();
}

/* ============================================================
   Mobile menu
   ============================================================ */
function toggleMobileMenu() {
  const isOpen = !el.mobileMenu.hidden;
  el.mobileMenu.hidden = isOpen;
  el.menuToggle.setAttribute('aria-expanded', String(!isOpen));
}
function closeMobileMenu() {
  el.mobileMenu.hidden = true;
  el.menuToggle.setAttribute('aria-expanded', 'false');
}

/* ============================================================
   Init
   ============================================================ */
async function initializeApp() {
  loadFavorites();
  loadRecentSearches();
  updateFavCount();
  renderRecentSearches();
  showLoading();

  wireEvents();

  try {
    const [corpus, categories, areas] = await Promise.all([
      searchRecipes(''),
      fetchCategories(),
      fetchAreas()
    ]);

    state.allRecipes = corpus;
    corpus.forEach(r => state.recipesById.set(r.id, r));

    renderCategoryPills(categories.length ? categories : [...new Set(corpus.map(r => r.category))].filter(Boolean).sort());
    renderCuisineOptions(areas.length ? areas : [...new Set(corpus.map(r => r.area))].filter(Boolean).sort());

    const urlQuery = new URLSearchParams(window.location.search).get('search');
    if (urlQuery) {
      el.searchInput.value = urlQuery;
      await handleSearch(urlQuery);
    } else {
      computeFilteredResults();
    }
  } catch (err) {
    showError();
  }
}

function wireEvents() {
  // nav
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.nav === 'explore' ? 'home' : btn.dataset.nav;
      switchView(target);
      if (btn.dataset.nav === 'explore') {
        document.querySelector('.search-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  el.menuToggle.addEventListener('click', toggleMobileMenu);
  el.exploreFromFavBtn.addEventListener('click', () => switchView('home'));

  // search
  el.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSearch(el.searchInput.value);
  });
  el.searchInput.addEventListener('input', () => {
    el.clearBtn.hidden = el.searchInput.value.length === 0;
    debouncedSuggest(el.searchInput.value);
  });
  el.searchInput.addEventListener('focus', () => {
    if (el.searchInput.value.trim()) renderSuggestions(getSuggestions(el.searchInput.value));
  });
  el.searchInput.addEventListener('keydown', (e) => {
    const items = Array.from(el.suggestionsList.querySelectorAll('li'));
    if (el.suggestionsList.hidden || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      suggestionIndex = Math.max(suggestionIndex - 1, 0);
    } else if (e.key === 'Escape') {
      hideSuggestions();
      return;
    } else if (e.key === 'Enter' && suggestionIndex >= 0) {
      e.preventDefault();
      const val = items[suggestionIndex].dataset.value;
      el.searchInput.value = val;
      handleSearch(val);
      return;
    } else {
      return;
    }
    items.forEach((li, i) => li.classList.toggle('is-active', i === suggestionIndex));
    items[suggestionIndex].scrollIntoView({ block: 'nearest' });
  });
  document.addEventListener('click', (e) => {
    if (!el.searchForm.contains(e.target)) hideSuggestions();
  });

  el.clearBtn.addEventListener('click', () => {
    el.searchInput.value = '';
    el.clearBtn.hidden = true;
    hideSuggestions();
    handleSearch('');
    el.searchInput.focus();
  });

  el.clearRecentBtn.addEventListener('click', clearRecentSearches);

  el.emptyState.querySelectorAll('[data-try]').forEach(btn => {
    btn.addEventListener('click', () => {
      el.searchInput.value = btn.dataset.try;
      handleSearch(btn.dataset.try);
    });
  });

  // sort
  el.sortSelect.addEventListener('change', () => {
    state.sortMode = el.sortSelect.value;
    computeFilteredResults();
  });

  // load more
  el.loadMoreBtn.addEventListener('click', renderResultsPage);

  // retry
  el.retryBtn.addEventListener('click', () => handleSearch(state.currentQuery));

  // filter drawer
  el.filterBtn.addEventListener('click', openFilterDrawer);
  el.drawerCloseBtn.addEventListener('click', closeFilterDrawer);
  el.drawerBackdrop.addEventListener('click', (e) => { if (e.target === el.drawerBackdrop) closeFilterDrawer(); });
  el.applyFiltersBtn.addEventListener('click', handleAdvancedFilters);
  el.filterDrawer.addEventListener('change', (e) => {
    if (e.target.matches('input[name="cuisine"], input[name="dietary"]')) {
      e.target.closest('.filter-pill').classList.toggle('is-checked', e.target.checked);
    }
  });
  el.resetFiltersBtn.addEventListener('click', () => {
    state.pendingCuisines = [];
    state.pendingDietary = [];
    state.activeCuisines = [];
    state.activeDietary = [];
    syncDrawerCheckboxes();
    computeFilteredResults();
  });

  // modal
  el.modalCloseBtn.addEventListener('click', closeRecipeDetails);
  el.modalBackdrop.addEventListener('click', (e) => { if (e.target === el.modalBackdrop) closeRecipeDetails(); });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!el.modalBackdrop.hidden) closeRecipeDetails();
    else if (!el.drawerBackdrop.hidden) closeFilterDrawer();
  });

  window.addEventListener('popstate', () => {
    const q = new URLSearchParams(window.location.search).get('search') || '';
    el.searchInput.value = q;
    handleSearch(q);
  });
}

document.addEventListener('DOMContentLoaded', initializeApp);
