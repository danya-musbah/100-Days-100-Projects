/**
 * app.js
 * Application initialization: connects github-api, analytics, charts,
 * storage, and ui modules, and wires up user interactions.
 */

(function App() {
  const state = {
    username: null,
    user: null,
    repos: [],
    events: [],
    langDist: { entries: [], usedFallback: false },
    filteredRepos: [],
    repoFilterText: '',
    repoFilterLang: 'all',
    repoSort: 'score',
    repoVisibleCount: 12,
    langColorMap: {},
  };

  function buildLangColorMap(langDist) {
    const map = {};
    langDist.entries.forEach((entry, i) => {
      map[entry.name] = Charts.PALETTE[i % Charts.PALETTE.length];
    });
    return map;
  }

  // ---- Decorative landing grid (CSS-based, no data) ----
  function buildDecorGrid() {
    const grid = document.getElementById('decor-grid');
    if (!grid || grid.childElementCount) return;
    const cells = 30;
    for (let i = 0; i < cells; i++) {
      const span = document.createElement('span');
      const intensity = Math.random();
      span.style.opacity = String(0.15 + intensity * 0.7);
      if (intensity > 0.75) span.style.background = 'var(--burnt-peach)';
      else if (intensity > 0.5) span.style.background = 'var(--lime-moss)';
      grid.appendChild(span);
    }
  }

  // ---- Validation ----
  function validateUsername(raw) {
    const value = (raw || '').trim();
    if (!value) return { valid: false, reason: 'Please enter a GitHub username.' };
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(value)) {
      return { valid: false, reason: 'Usernames may only contain letters, numbers, and hyphens.' };
    }
    return { valid: true, value };
  }

  // ---- Main analyze flow ----
  async function analyze(usernameRaw, options) {
    options = options || {};
    const validation = validateUsername(usernameRaw);
    if (!validation.valid) {
      UI.setLandingStatus(validation.reason);
      return;
    }
    const username = validation.value;

    UI.setLandingStatus('');
    UI.showView('loading');
    UI.setLoadingStage('profile');

    const prefs = Storage.getPreferences();
    let cached = null;
    if (!options.forceRefresh) {
      cached = Storage.getCache(username);
    }

    try {
      let user, repos, events, langResult;

      if (cached) {
        UI.setLoadingStage('repos');
        ({ user, repos, events, langResult } = cached);
        UI.setLoadingStage('analytics');
      } else {
        user = await GitHubAPI.fetchUser(username);

        UI.setLoadingStage('repos');
        repos = await GitHubAPI.fetchAllRepos(username);
        events = await GitHubAPI.fetchEvents(username);

        UI.setLoadingStage('analytics');
        langResult = await GitHubAPI.fetchAggregatedLanguages(username, repos);

        if (prefs.cacheEnabled) {
          Storage.setCache(username, { user, repos, events, langResult });
        }
      }

      UI.setLoadingStage('render');

      state.username = username;
      state.user = user;
      state.repos = repos;
      state.events = events;
      state.langDist = Analytics.languageDistribution(langResult.byteTotals, repos, langResult.usedFallback);
      state.langColorMap = buildLangColorMap(state.langDist);
      state.repoSort = prefs.defaultSort;
      state.repoVisibleCount = prefs.perPage;
      state.repoFilterText = '';
      state.repoFilterLang = 'all';
      document.getElementById('repo-search-input').value = '';
      document.getElementById('repo-sort-select').value = prefs.defaultSort;

      renderDashboard();
      Storage.addRecentProfile(user.login);
      UI.setTitle(user.login);

      const url = new URL(window.location.href);
      url.searchParams.set('user', user.login);
      window.history.replaceState({}, '', url);

      UI.showView('dashboard');
      UI.renderRateLimit(GitHubAPI.getRateLimit());
    } catch (err) {
      handleError(err);
    }
  }

  function handleError(err) {
    if (err instanceof GitHubAPI.GitHubAPIError) {
      if (err.type === 'not-found') {
        UI.showError("We couldn't find that GitHub user.", 'Check the username and try again.');
      } else if (err.type === 'rate-limit') {
        UI.showError('GitHub API rate limit reached.', 'Please try again later.');
      } else if (err.type === 'network') {
        UI.showError('Unable to connect to GitHub.', 'Check your internet connection and try again.');
      } else {
        UI.showError('GitHub is temporarily unavailable.', 'Please try again in a moment.');
      }
    } else {
      UI.showError('Something went wrong.', 'Please try again.');
    }
    UI.renderRateLimit(GitHubAPI.getRateLimit());
  }

  // ---- Dashboard rendering ----

  function renderDashboard() {
    const { user, repos, langDist } = state;

    UI.renderProfileHeader(user);

    const ranked = Analytics.rankRepositories(repos);
    const topByStars = repos.slice().sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))[0];

    UI.renderGlanceBar({
      repoCount: user.public_repos,
      stars: Analytics.totalStars(repos),
      followers: user.followers,
      languageCount: langDist.entries.length,
      mostUsedLanguage: langDist.entries[0] ? langDist.entries[0].name : null,
      mostPopularRepo: topByStars ? topByStars.name : null,
    });

    UI.renderMetrics([
      { value: user.public_repos ?? 0, label: 'Repositories' },
      { value: Analytics.formatCompactNumber(user.followers ?? 0), label: 'Followers' },
      { value: Analytics.formatCompactNumber(user.following ?? 0), label: 'Following' },
      { value: Analytics.formatCompactNumber(Analytics.totalStars(repos)), label: 'Total Stars' },
      { value: Analytics.formatCompactNumber(Analytics.totalForks(repos)), label: 'Total Forks' },
      { value: user.public_gists ?? 0, label: 'Public Gists' },
    ]);

    Charts.renderLanguageDonut(document.getElementById('language-chart'), langDist);

    const activity = Analytics.repoActivityBreakdown(repos);
    Charts.renderBarRows(document.getElementById('activity-chart'), [
      { label: 'Active (≤30d)', pct: activity.active.pct, count: activity.active.count, color: 'var(--burnt-peach)' },
      { label: 'Recent (≤180d)', pct: activity.recent.pct, count: activity.recent.count, color: 'var(--lime-moss)' },
      { label: 'Inactive (>180d)', pct: activity.inactive.pct, count: activity.inactive.count, color: 'var(--olive-leaf)' },
    ]);

    const types = Analytics.repoTypeBreakdown(repos);
    Charts.renderBarRows(document.getElementById('types-chart'), [
      { label: 'Original', pct: types.original.pct, count: types.original.count, color: 'var(--burnt-peach)' },
      { label: 'Forks', pct: types.forks.pct, count: types.forks.count, color: 'var(--lime-moss)' },
      { label: 'Archived', pct: types.archived.pct, count: types.archived.count, color: 'var(--olive-leaf)' },
    ]);

    renderCommitActivityForTopRepo();

    Charts.renderStarsChart(document.getElementById('stars-chart'), Analytics.topStarredRepos(repos, 10));

    // Repo filter chips from available languages
    const languages = Array.from(new Set(repos.map((r) => r.language).filter(Boolean))).sort();
    UI.renderRepoLangChips(languages, state.repoFilterLang, onLangSelect);

    applyRepoFilters(true);

    UI.renderTimeline(state.events);

    const insights = Analytics.generateInsights({
      repos, langDist, typeBreakdown: types, activityBreakdown: activity, user,
    });
    UI.renderInsights(insights);
  }

  function onLangSelect(lang) {
    state.repoFilterLang = lang;
    state.repoVisibleCount = Storage.getPreferences().perPage;
    const languages = Array.from(new Set(state.repos.map((r) => r.language).filter(Boolean))).sort();
    UI.renderRepoLangChips(languages, state.repoFilterLang, onLangSelect);
    applyRepoFilters(true);
  }

  async function renderCommitActivityForTopRepo() {
    const container = document.getElementById('commit-chart');
    const candidate = Analytics.rankRepositories(state.repos.filter((r) => !r.fork))[0] || Analytics.rankRepositories(state.repos)[0];
    if (!candidate) {
      Charts.renderCommitActivity(container, null);
      return;
    }
    container.innerHTML = '<p class="chart-empty">Loading commit activity…</p>';
    const owner = state.user.login;
    const data = await GitHubAPI.fetchCommitActivity(owner, candidate.name);
    Charts.renderCommitActivity(container, data, { pending: data === null });
    if (data && data.length) {
      const label = document.createElement('p');
      label.className = 'panel-sub';
      label.style.marginTop = '10px';
      label.textContent = `Weekly commits for ${candidate.name}, the most active repository.`;
      container.appendChild(label);
    }
  }

  // ---- Repository filtering / sorting / pagination ----

  function sortRepos(repos, sortKey) {
    const list = repos.slice();
    switch (sortKey) {
      case 'stars': return list.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
      case 'forks': return list.sort((a, b) => (b.forks_count || 0) - (a.forks_count || 0));
      case 'updated': return list.sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at));
      case 'created': return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case 'name': return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'score':
      default: return Analytics.rankRepositories(list);
    }
  }

  function applyRepoFilters(resetVisible) {
    const text = state.repoFilterText.toLowerCase();
    let filtered = state.repos.filter((r) => {
      const matchesText = !text || r.name.toLowerCase().includes(text) || (r.description || '').toLowerCase().includes(text);
      const matchesLang = state.repoFilterLang === 'all' || r.language === state.repoFilterLang;
      return matchesText && matchesLang;
    });
    filtered = sortRepos(filtered, state.repoSort);
    state.filteredRepos = filtered;

    if (resetVisible) state.repoVisibleCount = Storage.getPreferences().perPage;

    const visible = filtered.slice(0, state.repoVisibleCount);
    UI.renderRepoGrid(visible, state.langColorMap, false);
    UI.setLoadMoreVisible(filtered.length > visible.length);
  }

  // ---- Export ----

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    if (!state.user) return;
    const payload = {
      profile: state.user,
      totals: {
        stars: Analytics.totalStars(state.repos),
        forks: Analytics.totalForks(state.repos),
        repositories: state.repos.length,
      },
      languageDistribution: state.langDist.entries,
      repositories: state.repos.map((r) => ({
        name: r.name, stars: r.stargazers_count, forks: r.forks_count,
        language: r.language, updated: r.pushed_at || r.updated_at, url: r.html_url,
      })),
    };
    downloadBlob(`${state.username}-github-analytics.json`, JSON.stringify(payload, null, 2), 'application/json');
    UI.showToast('Exported JSON report');
  }

  function exportCSV() {
    if (!state.user) return;
    const header = ['name', 'stars', 'forks', 'language', 'updated', 'url'];
    const rows = state.repos.map((r) => [
      r.name, r.stargazers_count || 0, r.forks_count || 0,
      r.language || '', r.pushed_at || r.updated_at || '', r.html_url,
    ]);
    const csv = [header.join(',')]
      .concat(rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')))
      .join('\n');
    downloadBlob(`${state.username}-repositories.csv`, csv, 'text/csv');
    UI.showToast('Exported CSV report');
  }

  // ---- Settings modal ----

  function openSettings() {
    const prefs = Storage.getPreferences();
    document.getElementById('setting-per-page').value = String(prefs.perPage);
    document.getElementById('setting-default-sort').value = prefs.defaultSort;
    document.getElementById('setting-animations').checked = prefs.animations;
    document.getElementById('setting-cache').checked = prefs.cacheEnabled;
    UI.renderRateLimit(GitHubAPI.getRateLimit());
    document.getElementById('settings-backdrop').hidden = false;
  }

  function closeSettings() {
    document.getElementById('settings-backdrop').hidden = true;
  }

  function saveSettingsFromForm() {
    const prefs = Storage.setPreferences({
      perPage: Number(document.getElementById('setting-per-page').value),
      defaultSort: document.getElementById('setting-default-sort').value,
      animations: document.getElementById('setting-animations').checked,
      cacheEnabled: document.getElementById('setting-cache').checked,
    });
    document.body.classList.toggle('no-animations', !prefs.animations);
  }

  // ---- Wire up events ----

  function init() {
    buildDecorGrid();

    const settingsModal = document.getElementById('settings-backdrop');
    if (settingsModal) settingsModal.hidden = true;

    const prefs = Storage.getPreferences();
    document.body.classList.toggle('no-animations', !prefs.animations);

    UI.renderRecentProfiles(Storage.getRecentProfiles(), (username) => analyze(username));

    document.getElementById('landing-search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      analyze(document.getElementById('landing-search-input').value);
    });

    document.getElementById('header-search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      analyze(document.getElementById('header-search-input').value);
    });

    document.querySelectorAll('.try-btn').forEach((btn) => {
      btn.addEventListener('click', () => analyze(btn.getAttribute('data-user')));
    });

    document.getElementById('error-back-btn').addEventListener('click', () => {
      UI.showView('landing');
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
      if (state.username) analyze(state.username, { forceRefresh: true });
    });

    document.getElementById('repo-search-input').addEventListener('input', (e) => {
      state.repoFilterText = e.target.value;
      applyRepoFilters(true);
    });

    document.getElementById('repo-sort-select').addEventListener('change', (e) => {
      state.repoSort = e.target.value;
      applyRepoFilters(false);
    });

    document.getElementById('repo-loadmore-btn').addEventListener('click', () => {
      state.repoVisibleCount += Storage.getPreferences().perPage;
      applyRepoFilters(false);
    });

    document.getElementById('export-json-btn').addEventListener('click', exportJSON);
    document.getElementById('export-csv-btn').addEventListener('click', exportCSV);

    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('settings-close-btn').addEventListener('click', closeSettings);
    document.getElementById('settings-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'settings-backdrop') closeSettings();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSettings();
    });

    ['setting-per-page', 'setting-default-sort', 'setting-animations', 'setting-cache'].forEach((id) => {
      document.getElementById(id).addEventListener('change', saveSettingsFromForm);
    });

    document.getElementById('clear-recent-btn').addEventListener('click', () => {
      Storage.clearRecentProfiles();
      UI.renderRecentProfiles([], () => {});
      UI.showToast('Recent searches cleared');
    });

    document.getElementById('clear-cache-btn').addEventListener('click', () => {
      Storage.clearAllCache();
      UI.showToast('Cached data cleared');
    });

    // Shareable URL support: ?user=username
    const params = new URLSearchParams(window.location.search);
    const initialUser = params.get('user');
    if (initialUser) {
      analyze(initialUser);
    } else {
      UI.showView('landing');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
