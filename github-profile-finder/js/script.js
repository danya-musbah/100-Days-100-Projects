/* ===========================================================
   GitScope — Developer DNA Observatory
   Vanilla JS application. No frameworks, no build step.
   =========================================================== */
'use strict';

/* ===========================================================
   CONFIG
   =========================================================== */
const CONFIG = {
  API_BASE: 'https://api.github.com',
  CACHE_TTL_MS: 10 * 60 * 1000,      // 10 minutes
  REQUEST_TIMEOUT_MS: 12000,
  MAX_REPO_PAGES: 2,                  // up to 200 repos fetched
  REPOS_PER_PAGE: 100,
  REPO_PAGE_SIZE_UI: 30,              // "load more" page size in the explorer
  MAX_LANGUAGE_DETAIL_REPOS: 8,       // repos we fetch full language breakdown for
  MAX_HISTORY: 10,
  EVENTS_PER_PAGE: 30,
  STORAGE_KEYS: {
    history: 'gitscope_history',
    favorites: 'gitscope_favorites',
    cachePrefix: 'gitscope_cache_',
    settings: 'gitscope_settings'
  }
};

const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  'C++': '#f34b7d', C: '#555555', 'C#': '#178600', Go: '#00ADD8', Rust: '#dea584',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF', HTML: '#e34c26',
  CSS: '#563d7c', Shell: '#89e051', Vue: '#41b883', Dart: '#00B4AB', Scala: '#c22d40',
  Elixir: '#6e4a7e', Haskell: '#5e5086', Lua: '#000080', 'Objective-C': '#438eff',
  'Jupyter Notebook': '#DA5B0B', Perl: '#0298c3', R: '#198CE7', MATLAB: '#e16737',
  Other: '#8FA3B8'
};
function colorForLanguage(lang){
  return LANGUAGE_COLORS[lang] || pastelFromString(lang || 'Other');
}
function pastelFromString(str){
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 62%)`;
}

/* ===========================================================
   STATE
   =========================================================== */
const state = {
  username: '',
  user: null,
  repos: [],
  reposTotalCount: null,
  events: [],
  eventsAvailable: true,
  languageTotals: {},        // { lang: bytesOrWeight }
  languageAvailable: true,
  analysis: null,
  errors: { languages: false, events: false, repos: false },
  loading: false,
  filters: { text: '', type: 'all', sort: 'popular', topic: null },
  visibleRepoCount: CONFIG.REPO_PAGE_SIZE_UI,
  searchHistory: [],
  favorites: [],
  settings: { animations: true, reducedMotion: false, useCache: true },
  fetchedAt: null,
  compare: { a: null, b: null }
};

/* ===========================================================
   DOM SHORTCUTS
   =========================================================== */
const $ = (id) => document.getElementById(id);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ===========================================================
   UTILITIES
   =========================================================== */
function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function normalizeUsername(raw) {
  if (!raw) return '';
  return raw.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/.*$/, '');
}

function validateUsername(name) {
  if (!name) return false;
  if (name.length > 39) return false;
  return /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/.test(name);
}

function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'unknown';
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  const month = Math.round(day / 30);
  const year = Math.round(day / 365);
  if (sec < 60) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  if (month < 12) return `${month} month${month === 1 ? '' : 's'} ago`;
  return `${year} year${year === 1 ? '' : 's'} ago`;
}

function formatFullDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / 86400000;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function animateNumber(el, target, opts = {}) {
  if (!el) return;
  target = Number(target) || 0;
  if (!state.settings.animations || state.settings.reducedMotion) {
    el.textContent = formatNumber(target);
    return;
  }
  const duration = opts.duration || 800;
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const p = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = Math.round(from + (target - from) * eased);
    el.textContent = formatNumber(val);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function safeText(el, text) {
  if (!el) return;
  el.textContent = text;
}

/* ===========================================================
   TOAST
   =========================================================== */
function showToast(message) {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ===========================================================
   TOOLTIP SYSTEM
   =========================================================== */
const Tooltip = {
  el: null,
  init() { this.el = $('tooltip'); },
  show(x, y, title, lines) {
    if (!this.el) return;
    this.el.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    this.el.appendChild(strong);
    (lines || []).forEach(line => {
      const span = document.createElement('span');
      span.className = 'tt-label';
      span.textContent = line;
      this.el.appendChild(span);
    });
    this.el.hidden = false;
    const pad = 14;
    let left = x + pad, top = y + pad;
    const rect = this.el.getBoundingClientRect();
    if (left + rect.width > window.innerWidth - 10) left = x - rect.width - pad;
    if (top + rect.height > window.innerHeight - 10) top = y - rect.height - pad;
    this.el.style.left = left + 'px';
    this.el.style.top = top + 'px';
  },
  hide() { if (this.el) this.el.hidden = true; }
};

/* ===========================================================
   LOCAL STORAGE: CACHE / HISTORY / FAVORITES / SETTINGS
   =========================================================== */
const Cache = {
  key(username) { return CONFIG.STORAGE_KEYS.cachePrefix + username.toLowerCase(); },
  save(username, payload) {
    try {
      localStorage.setItem(this.key(username), JSON.stringify({ data: payload, timestamp: Date.now() }));
    } catch (e) { /* storage full or unavailable — fail silently */ }
  },
  load(username) {
    try {
      const raw = localStorage.getItem(this.key(username));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.timestamp || !parsed.data) return null;
      const age = Date.now() - parsed.timestamp;
      if (age > CONFIG.CACHE_TTL_MS) return null;
      return parsed.data;
    } catch (e) { return null; }
  },
  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CONFIG.STORAGE_KEYS.cachePrefix))
      .forEach(k => localStorage.removeItem(k));
  }
};

const HistoryStore = {
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.history);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  save(list) {
    try { localStorage.setItem(CONFIG.STORAGE_KEYS.history, JSON.stringify(list)); } catch (e) {}
  },
  add(username) {
    let list = this.load().filter(u => u.toLowerCase() !== username.toLowerCase());
    list.unshift(username);
    list = list.slice(0, CONFIG.MAX_HISTORY);
    this.save(list);
    state.searchHistory = list;
  },
  remove(username) {
    const list = this.load().filter(u => u.toLowerCase() !== username.toLowerCase());
    this.save(list);
    state.searchHistory = list;
  },
  clear() { this.save([]); state.searchHistory = []; }
};

const FavoritesStore = {
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.favorites);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  save(list) {
    try { localStorage.setItem(CONFIG.STORAGE_KEYS.favorites, JSON.stringify(list)); } catch (e) {}
  },
  isFavorite(username) {
    return this.load().some(f => f.username.toLowerCase() === username.toLowerCase());
  },
  add(username, avatarUrl) {
    const list = this.load().filter(f => f.username.toLowerCase() !== username.toLowerCase());
    list.unshift({ username, avatarUrl: avatarUrl || '', savedAt: Date.now() });
    this.save(list);
    state.favorites = list;
  },
  remove(username) {
    const list = this.load().filter(f => f.username.toLowerCase() !== username.toLowerCase());
    this.save(list);
    state.favorites = list;
  },
  clear() { this.save([]); state.favorites = []; }
};

const SettingsStore = {
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.settings);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  save(settings) {
    try { localStorage.setItem(CONFIG.STORAGE_KEYS.settings, JSON.stringify(settings)); } catch (e) {}
  }
};

/* ===========================================================
   GITHUB API LAYER
   =========================================================== */
async function ghFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' }
    });
    clearTimeout(timeout);

    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0' || res.status === 429) {
        return { ok: false, kind: 'rate_limit', status: res.status };
      }
      return { ok: false, kind: 'forbidden', status: res.status };
    }
    if (res.status === 404) {
      return { ok: false, kind: 'not_found', status: res.status };
    }
    if (!res.ok) {
      return { ok: false, kind: 'unknown', status: res.status };
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      return { ok: false, kind: 'invalid_response', status: res.status };
    }
    return { ok: true, data, headers: res.headers };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') return { ok: false, kind: 'timeout' };
    return { ok: false, kind: 'network' };
  }
}

const GitHubAPI = {
  getUser(username) {
    return ghFetch(`${CONFIG.API_BASE}/users/${encodeURIComponent(username)}`);
  },
  async getRepositories(username) {
    let all = [];
    let truncated = false;
    for (let page = 1; page <= CONFIG.MAX_REPO_PAGES; page++) {
      const res = await ghFetch(`${CONFIG.API_BASE}/users/${encodeURIComponent(username)}/repos?per_page=${CONFIG.REPOS_PER_PAGE}&page=${page}&sort=updated`);
      if (!res.ok) {
        if (page === 1) return res; // first page failed entirely
        break; // partial success: keep what we have
      }
      all = all.concat(res.data);
      if (res.data.length < CONFIG.REPOS_PER_PAGE) { truncated = false; break; }
      truncated = true;
    }
    return { ok: true, data: all, truncated };
  },
  getRepositoryLanguages(owner, repo) {
    return ghFetch(`${CONFIG.API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`);
  },
  getEvents(username) {
    return ghFetch(`${CONFIG.API_BASE}/users/${encodeURIComponent(username)}/events/public?per_page=${CONFIG.EVENTS_PER_PAGE}`);
  }
};

/* ===========================================================
   DATA LOADING ORCHESTRATION
   =========================================================== */
async function loadFullProfile(username, opts = {}) {
  const bypassCache = !!opts.bypassCache;

  if (!bypassCache && state.settings.useCache) {
    const cached = Cache.load(username);
    if (cached) {
      applyLoadedData(cached, { fromCache: true });
      return { ok: true, fromCache: true };
    }
  }

  setStage('identity', 'active');
  const userRes = await GitHubAPI.getUser(username);
  if (!userRes.ok) return { ok: false, error: userRes };
  setStage('identity', 'done');

  const errors = { languages: false, events: false, repos: false };

  setStage('repos', 'active');
  const repoRes = await GitHubAPI.getRepositories(username);
  let repos = [];
  if (repoRes.ok) {
    repos = repoRes.data;
  } else {
    errors.repos = true;
  }
  setStage('repos', 'done');

  setStage('languages', 'active');
  let languageTotals = {};
  let languagesOk = true;
  if (repos.length) {
    const nonForkSorted = repos
      .filter(r => !r.fork)
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, CONFIG.MAX_LANGUAGE_DETAIL_REPOS);

    const detailedRepoNames = new Set(nonForkSorted.map(r => r.name));

    for (const repo of nonForkSorted) {
      const langRes = await GitHubAPI.getRepositoryLanguages(repo.owner.login, repo.name);
      if (langRes.ok) {
        for (const [lang, bytes] of Object.entries(langRes.data)) {
          languageTotals[lang] = (languageTotals[lang] || 0) + bytes;
        }
      } else if (langRes.kind === 'rate_limit') {
        languagesOk = false;
        break;
      }
    }
    // For repos we did not fetch full detail for, fall back to their primary `language`
    // field (still real GitHub-provided data, not a name-based guess), weighted as a
    // nominal share so they still contribute to the overall distribution.
    const fallbackWeight = Object.values(languageTotals).length
      ? Math.max(...Object.values(languageTotals)) * 0.15
      : 1000;
    repos.forEach(r => {
      if (!detailedRepoNames.has(r.name) && r.language) {
        languageTotals[r.language] = (languageTotals[r.language] || 0) + fallbackWeight;
      }
    });
  } else {
    languagesOk = false;
  }
  errors.languages = !languagesOk;
  setStage('languages', 'done');

  setStage('activity', 'active');
  const eventsRes = await GitHubAPI.getEvents(username);
  let events = [];
  if (eventsRes.ok) {
    events = eventsRes.data;
  } else {
    errors.events = true;
  }
  setStage('activity', 'done');

  setStage('dna', 'active');
  const payload = {
    user: userRes.data,
    repos,
    reposTotalCount: userRes.data.public_repos,
    events,
    languageTotals,
    errors,
    fetchedAt: Date.now()
  };
  Cache.save(username, payload);
  applyLoadedData(payload, { fromCache: false });
  setStage('dna', 'done');

  return { ok: true, fromCache: false };
}

function applyLoadedData(payload, meta) {
  state.user = payload.user;
  state.repos = payload.repos || [];
  state.reposTotalCount = payload.reposTotalCount;
  state.events = payload.events || [];
  state.languageTotals = payload.languageTotals || {};
  state.errors = payload.errors || { languages: false, events: false, repos: false };
  state.fetchedAt = payload.fetchedAt;
  state.analysis = Analyzer.analyze(state);
}

function setStage(stage, mode) {
  const li = document.querySelector(`#scan-stages li[data-stage="${stage}"]`);
  if (!li) return;
  li.classList.remove('active', 'done');
  li.classList.add(mode);
}
function resetStages() {
  qsa('#scan-stages li').forEach(li => li.classList.remove('active', 'done'));
}

/* ===========================================================
   ANALYZER — turns raw GitHub data into observable signals
   =========================================================== */
const Analyzer = {
  analyze(s) {
    const repos = s.repos || [];
    const languageStats = this.getLanguageStats(s.languageTotals);
    const repoStats = this.getRepositoryStats(repos);
    const activityStats = this.getActivityStats(repos, s.events);
    const communityStats = this.getCommunityStats(s.user, repos);
    const topicStats = this.getTopicStats(repos);
    const timeline = this.getTimeline(repos);
    const dna = this.calculateDNA({ repos, languageStats, repoStats, activityStats, communityStats });
    const archetypes = repos.map(r => this.classifyRepo(r));
    const insights = this.generateInsights({ languageStats, repoStats, activityStats, communityStats, dna, repos });
    const snapshot = this.generateSnapshot({ languageStats, repoStats, activityStats, communityStats, repos, user: s.user });
    const evolution = this.getEvolution(repos);
    const thenVsNow = this.getThenVsNow(repos);
    const rhythm = this.getRhythm(s.events, repos);

    return {
      languageStats, repoStats, activityStats, communityStats, topicStats,
      timeline, dna, archetypes, insights, snapshot, evolution, thenVsNow, rhythm
    };
  },

  // ---- language distribution from real per-repo language data ----
  getLanguageStats(languageTotals) {
    const entries = Object.entries(languageTotals || {});
    const total = entries.reduce((sum, [, v]) => sum + v, 0);
    if (!entries.length || total === 0) {
      return { available: false, distribution: [], distinctCount: 0 };
    }
    let distribution = entries
      .map(([lang, val]) => ({ lang, value: val, pct: (val / total) * 100 }))
      .sort((a, b) => b.value - a.value);

    // collapse the long tail into "Other" beyond the top 6 for readability
    if (distribution.length > 6) {
      const top = distribution.slice(0, 5);
      const restPct = distribution.slice(5).reduce((sum, d) => sum + d.pct, 0);
      const restVal = distribution.slice(5).reduce((sum, d) => sum + d.value, 0);
      top.push({ lang: 'Other', value: restVal, pct: restPct });
      distribution = top;
    }
    return { available: true, distribution, distinctCount: entries.length };
  },

  // ---- repository-level metrics ----
  getRepositoryStats(repos) {
    if (!repos.length) return { available: false };
    const nonFork = repos.filter(r => !r.fork);
    const forks = repos.filter(r => r.fork);
    const archived = repos.filter(r => r.archived);
    const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
    const totalForks = repos.reduce((s, r) => s + (r.forks_count || 0), 0);
    const activeRecently = repos.filter(r => daysSince(r.pushed_at) <= 90).length;
    const maxStars = Math.max(0, ...repos.map(r => r.stargazers_count || 0));
    return {
      available: true,
      count: repos.length,
      nonForkCount: nonFork.length,
      forkCount: forks.length,
      archivedCount: archived.length,
      totalStars, totalForks, maxStars,
      activeRecently,
      activeRecentlyRatio: repos.length ? activeRecently / repos.length : 0
    };
  },

  // ---- activity / recency metrics ----
  getActivityStats(repos, events) {
    const mostRecentPush = repos.reduce((latest, r) => {
      const t = r.pushed_at ? new Date(r.pushed_at).getTime() : 0;
      return t > latest ? t : latest;
    }, 0);
    const recentPushDays = mostRecentPush ? daysSince(new Date(mostRecentPush).toISOString()) : null;

    // consistency: distinct weeks (last 12 weeks) with at least one repo push
    const weeks = new Set();
    const now = Date.now();
    repos.forEach(r => {
      if (!r.pushed_at) return;
      const diffDays = daysSince(r.pushed_at);
      if (diffDays <= 84) {
        const weekIndex = Math.floor(diffDays / 7);
        weeks.add(weekIndex);
      }
    });

    return {
      available: repos.length > 0,
      mostRecentPushDays: recentPushDays,
      consistencyWeeks: weeks.size,
      eventsAvailable: Array.isArray(events) && events.length >= 0,
      eventsCount: (events || []).length
    };
  },

  // ---- community / reach metrics ----
  getCommunityStats(user, repos) {
    const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
    const totalForks = repos.reduce((s, r) => s + (r.forks_count || 0), 0);
    return {
      followers: user.followers || 0,
      following: user.following || 0,
      starsReceived: totalStars,
      forksReceived: totalForks,
      publicRepos: user.public_repos || 0
    };
  },

  // ---- topics ----
  getTopicStats(repos) {
    const counts = {};
    repos.forEach(r => (r.topics || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    const list = Object.entries(counts).map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count);
    return { available: list.length > 0, topics: list };
  },

  // ---- chronological timeline grouped by year ----
  getTimeline(repos) {
    const withDates = repos.filter(r => r.created_at);
    const byYear = {};
    withDates.forEach(r => {
      const year = new Date(r.created_at).getFullYear();
      byYear[year] = byYear[year] || [];
      byYear[year].push(r);
    });
    const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
    return { available: years.length > 0, years: years.map(y => ({ year: y, repos: byYear[y] })) };
  },

  // ---- then vs now ----
  getThenVsNow(repos) {
    const withDates = repos.filter(r => r.created_at).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (withDates.length < 4) return { available: false };
    const mid = Math.floor(withDates.length / 2);
    const earlier = withDates.slice(0, mid);
    const recent = withDates.slice(mid);
    const langs = (arr) => [...new Set(arr.map(r => r.language).filter(Boolean))];
    const avgStars = (arr) => arr.length ? Math.round(arr.reduce((s, r) => s + (r.stargazers_count || 0), 0) / arr.length) : 0;
    const topics = (arr) => new Set(arr.flatMap(r => r.topics || [])).size;
    return {
      available: true,
      earlier: { languages: langs(earlier), avgStars: avgStars(earlier), topicCount: topics(earlier), count: earlier.length },
      recent: { languages: langs(recent), avgStars: avgStars(recent), topicCount: topics(recent), count: recent.length }
    };
  },

  // ---- language evolution narrative ----
  getEvolution(repos) {
    const withDates = repos.filter(r => r.created_at && r.language).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (withDates.length < 3) return { available: false };
    const third = Math.max(1, Math.floor(withDates.length / 3));
    const early = withDates.slice(0, third);
    const mid = withDates.slice(third, third * 2);
    const recent = withDates.slice(third * 2);

    const uniqueOrdered = (arr, exclude = []) => {
      const seen = new Set(exclude);
      const out = [];
      arr.forEach(r => { if (!seen.has(r.language)) { out.push(r.language); seen.add(r.language); } });
      return out;
    };
    const startedWith = uniqueOrdered(early);
    const expandedInto = uniqueOrdered(mid, startedWith);
    const recentlyExploring = uniqueOrdered(recent, [...startedWith, ...expandedInto]);

    return {
      available: startedWith.length > 0,
      startedWith: startedWith.slice(0, 2),
      expandedInto: expandedInto.slice(0, 2),
      recentlyExploring: recentlyExploring.slice(0, 2)
    };
  },

  // ---- rhythm: event frequency over recent days ----
  getRhythm(events, repos) {
    const days = 30;
    const buckets = new Array(days).fill(0);
    let source = 'events';
    let usable = Array.isArray(events) ? events : [];

    if (usable.length > 0) {
      usable.forEach(ev => {
        const d = daysSince(ev.created_at);
        const idx = days - 1 - Math.floor(d);
        if (idx >= 0 && idx < days) buckets[idx]++;
      });
    } else {
      // fall back to repository push recency as a coarse proxy
      source = 'repos';
      repos.forEach(r => {
        if (!r.pushed_at) return;
        const d = daysSince(r.pushed_at);
        const idx = days - 1 - Math.floor(d);
        if (idx >= 0 && idx < days) buckets[idx]++;
      });
    }

    const hasSignal = buckets.some(v => v > 0);
    return { available: hasSignal, buckets, days, source };
  },

  // ---- repository archetype classification (transparent rules) ----
  classifyRepo(repo) {
    const name = (repo.name || '').toLowerCase();
    const desc = (repo.description || '').toLowerCase();
    const topics = (repo.topics || []).map(t => t.toLowerCase());
    const daysOld = daysSince(repo.created_at);
    const daysSincePush = daysSince(repo.pushed_at);

    if (repo.archived) return 'Archived Project';
    if (repo.fork) return 'Fork';
    if (name.includes('doc') || name.includes('wiki') || topics.includes('documentation') || desc.includes('documentation')) {
      return 'Documentation';
    }
    if (topics.some(t => ['library', 'framework', 'sdk', 'cli', 'tool', 'package'].includes(t)) ||
        name.includes('lib') || name.includes('sdk') || name.includes('cli')) {
      return 'Library / Tool';
    }
    if (daysSincePush <= 60 && repo.size > 200) return 'Active Project';
    if (daysOld <= 45 && (repo.stargazers_count || 0) === 0) return 'Experiment';
    if (daysSincePush > 365) return 'Personal Project';
    return 'Active Project';
  },

  // ---- Developer DNA: transparent 0-100 dimensions ----
  calculateDNA({ repos, languageStats, repoStats, activityStats, communityStats }) {
    if (!repos.length) return { available: false };

    // Activity: share of repositories updated within the last 90 days
    const activity = repoStats.available ? clamp(repoStats.activeRecentlyRatio * 100, 0, 100) : 0;

    // Recency: decays from 100 (updated today) toward 0 (updated 2 years+ ago)
    const recDays = activityStats.mostRecentPushDays;
    const recency = recDays === null ? 0 : clamp(100 - (recDays / 730) * 100, 0, 100);

    // Language Diversity: distinct languages, saturating at 8 languages
    const languageDiversity = languageStats.available ? clamp((languageStats.distinctCount / 8) * 100, 0, 100) : 0;

    // Project Diversity: mix of topics + non-fork share
    const topicSet = new Set(repos.flatMap(r => r.topics || []));
    const projectDiversity = clamp(
      (Math.min(topicSet.size, 10) / 10) * 60 + (repoStats.nonForkCount / Math.max(1, repoStats.count)) * 40,
      0, 100
    );

    // Community Reach: log-scaled followers + stars + forks
    const reach = Math.log10(1 + communityStats.followers) * 22 +
                  Math.log10(1 + communityStats.starsReceived) * 22 +
                  Math.log10(1 + communityStats.forksReceived) * 18;
    const communityReach = clamp(reach, 0, 100);

    // Consistency: distinct active weeks out of the last 12
    const consistency = clamp((activityStats.consistencyWeeks / 12) * 100, 0, 100);

    // Open Source Impact: stars+forks concentration on non-fork repos
    const osiRaw = repoStats.nonForkCount > 0
      ? Math.log10(1 + (repoStats.totalStars + repoStats.totalForks) / repoStats.nonForkCount) * 45
      : 0;
    const openSourceImpact = clamp(osiRaw, 0, 100);

    const dims = [
      { key: 'activity', label: 'Activity', value: Math.round(activity) },
      { key: 'languageDiversity', label: 'Language Diversity', value: Math.round(languageDiversity) },
      { key: 'projectDiversity', label: 'Project Diversity', value: Math.round(projectDiversity) },
      { key: 'communityReach', label: 'Community Reach', value: Math.round(communityReach) },
      { key: 'consistency', label: 'Consistency', value: Math.round(consistency) },
      { key: 'openSourceImpact', label: 'Open Source Impact', value: Math.round(openSourceImpact) },
      { key: 'recency', label: 'Recency', value: Math.round(recency) }
    ];
    return { available: true, dims };
  },

  // ---- evidence-based insight sentences ----
  generateInsights({ languageStats, repoStats, activityStats, communityStats, dna, repos }) {
    const list = [];
    if (languageStats.available && languageStats.distinctCount >= 4) {
      list.push(`High language diversity — ${languageStats.distinctCount} languages detected across analyzed repositories.`);
    }
    if (repoStats.available && repoStats.activeRecently >= 3) {
      list.push(`Several recently updated projects — ${repoStats.activeRecently} repositories updated in the last 90 days.`);
    }
    if (repoStats.available && repoStats.totalStars > 0 && repoStats.maxStars / Math.max(1, repoStats.totalStars) > 0.5 && repoStats.count > 3) {
      list.push('Strong repository popularity concentration — a small number of projects account for most stars.');
    }
    if (activityStats.eventsCount >= 5) {
      list.push(`Active public development signals — ${activityStats.eventsCount} public events in the recent window.`);
    }
    if (repoStats.available && repoStats.forkCount > repoStats.nonForkCount) {
      list.push('Notable use of forked repositories relative to original projects.');
    }
    if (communityStats.starsReceived > 100) {
      list.push(`Meaningful community reach — ${formatNumber(communityStats.starsReceived)} stars received across public repositories.`);
    }
    if (!list.length) {
      list.push('Limited public signal available — this profile has relatively little public repository or activity data.');
    }
    return list;
  },

  // ---- deterministic one-line snapshot ----
  generateSnapshot({ languageStats, repoStats, activityStats, communityStats, repos, user }) {
    const parts = [];
    if (languageStats.available && languageStats.distribution.length) {
      const top = languageStats.distribution[0];
      if (top.pct >= 40) parts.push(`A ${top.lang}-heavy developer`);
      else if (languageStats.distinctCount >= 4) parts.push(`A polyglot developer across ${languageStats.distinctCount} languages`);
      else parts.push(`A developer working primarily in ${top.lang}`);
    } else {
      parts.push('A developer with a public GitHub presence');
    }

    if (communityStats.starsReceived > 500) parts.push('a substantial open-source footprint');
    else if (communityStats.starsReceived > 0) parts.push('a growing open-source footprint');

    if (repoStats.available && repoStats.nonForkCount >= 6) parts.push(`a diverse set of ${repoStats.nonForkCount} public projects`);

    if (activityStats.mostRecentPushDays !== null && activityStats.mostRecentPushDays <= 30) {
      parts.push('recent, active development');
    }

    if (parts.length === 1) return parts[0] + '.';
    const last = parts.pop();
    return `${parts.join(', ')} and ${last}.`;
  }
};

/* ===========================================================
   RENDERERS
   =========================================================== */
const Renderer = {

  renderAll() {
    this.renderProfileHeader();
    this.renderSnapshot();
    this.renderObservatory();
    this.renderDNA();
    this.renderSignals();
    this.renderLanguages();
    this.renderLanguageOrbit();
    this.renderRepoUniverse();
    this.renderRepoExplorer();
    this.renderActivity();
    this.renderTimeline();
    this.renderThenVsNow();
    this.renderEvolution();
    this.renderTopics();
    this.renderCommunity();
    this.renderStarMap();
    this.renderTimestamp();
    this.renderPartialWarning();
    this.updateFavoriteButton();
  },

  renderProfileHeader() {
    const u = state.user;
    $('avatar-skeleton').hidden = true;
    const avatarImg = $('profile-avatar');
    avatarImg.src = u.avatar_url;
    avatarImg.alt = `${u.login}'s GitHub avatar`;
    avatarImg.hidden = false;

    safeText($('profile-name'), u.name || u.login);
    safeText($('profile-username'), '@' + u.login);

    const bioEl = $('profile-bio');
    if (u.bio) { bioEl.textContent = u.bio; bioEl.hidden = false; } else { bioEl.hidden = true; }

    const meta = $('profile-meta');
    meta.innerHTML = '';
    const metaItems = [];
    if (u.location) metaItems.push(`📍 ${u.location}`);
    if (u.company) metaItems.push(`🏢 ${u.company}`);
    metaItems.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      meta.appendChild(li);
    });

    const links = $('profile-links');
    links.innerHTML = '';
    if (u.blog) {
      const url = /^https?:\/\//.test(u.blog) ? u.blog : `https://${u.blog}`;
      links.appendChild(makeLink(url, 'Website'));
    }
    if (u.twitter_username) {
      links.appendChild(makeLink(`https://twitter.com/${u.twitter_username}`, 'Twitter/X'));
    }
    links.appendChild(makeLink(u.html_url, 'GitHub profile'));

    function makeLink(href, label) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = href; a.textContent = label; a.target = '_blank'; a.rel = 'noopener noreferrer';
      li.appendChild(a);
      return li;
    }

    const stats = $('profile-stats');
    stats.innerHTML = '';
    const statDefs = [
      ['followers', u.followers], ['following', u.following], ['repositories', u.public_repos]
    ];
    statDefs.forEach(([label, val]) => {
      const block = document.createElement('div');
      block.className = 'stat-block';
      const num = document.createElement('span');
      num.className = 'stat-num';
      block.appendChild(num);
      const lbl = document.createElement('span');
      lbl.className = 'stat-label';
      lbl.textContent = label;
      block.appendChild(lbl);
      stats.appendChild(block);
      animateNumber(num, val);
    });

    $('btn-view-github').href = u.html_url;
  },

  renderSnapshot() {
    const line = state.analysis.snapshot;
    safeText($('snapshot-line'), line);
  },

  renderPartialWarning() {
    const el = $('partial-warning');
    const missing = [];
    if (state.errors.repos) missing.push('repository data');
    if (state.errors.languages) missing.push('language analysis');
    if (state.errors.events) missing.push('recent activity');
    if (missing.length) {
      el.hidden = false;
      el.textContent = `Some GitHub data is currently unavailable (${missing.join(', ')}). The available profile information is still shown.`;
    } else {
      el.hidden = true;
    }
  },

  renderTimestamp() {
    const d = new Date(state.fetchedAt);
    safeText($('data-timestamp'), `Analysis based on public GitHub data · Last updated: ${d.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
  },

  // ---------------- OBSERVATORY ----------------
  renderObservatory() {
    const el = $('observatory');
    el.innerHTML = '';
    const rings = [140, 190];
    rings.forEach(r => {
      const ring = document.createElement('div');
      ring.className = 'orbit-ring';
      ring.style.width = r * 2 + 'px';
      ring.style.height = r * 2 + 'px';
      el.appendChild(ring);
    });

    const core = document.createElement('div');
    core.className = 'orbit-core';
    core.innerHTML = `<strong>${escapeAlt(state.user.login)}</strong><span>Developer DNA</span>`;
    el.appendChild(core);

    const nodes = [
      { label: 'Languages', value: state.analysis.languageStats.available ? state.analysis.languageStats.distinctCount : '—', target: 'lang-dna-title', ring: 0, angle: -90, spin: 'a' },
      { label: 'Repositories', value: state.repos.length, target: 'repo-universe-title', ring: 1, angle: -150, spin: 'b' },
      { label: 'Activity', value: state.analysis.activityStats.eventsCount || (state.errors.events ? '—' : 0), target: 'activity-title', ring: 0, angle: 30, spin: 'a' },
      { label: 'Stars', value: state.analysis.communityStats.starsReceived, target: 'community-title', ring: 1, angle: 90, spin: 'b' },
      { label: 'Topics', value: state.analysis.topicStats.available ? state.analysis.topicStats.topics.length : 0, target: 'topic-title', ring: 0, angle: 150, spin: 'a' }
    ];

    nodes.forEach(n => {
      const radius = rings[n.ring];
      const rad = (n.angle * Math.PI) / 180;
      const x = radius * Math.cos(rad);
      const y = radius * Math.sin(rad);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `orbit-node orbit-spin-${n.spin}`;
      btn.style.left = `calc(50% + ${x}px)`;
      btn.style.top = `calc(50% + ${y}px)`;
      btn.setAttribute('aria-label', `${n.label}: ${n.value}. Jump to ${n.label} section.`);
      btn.innerHTML = `<span class="node-dot orbit-node-fixed">${escapeAlt(String(n.value))}</span><span class="node-label orbit-node-fixed">${escapeAlt(n.label)}</span>`;
      btn.addEventListener('click', () => {
        const target = $(n.target);
        if (target) target.scrollIntoView({ behavior: state.settings.reducedMotion ? 'auto' : 'smooth', block: 'start' });
      });
      el.appendChild(btn);
    });
  },

  // ---------------- DEVELOPER DNA RADAR ----------------
  renderDNA() {
    const svg = $('dna-radar');
    svg.innerHTML = '';
    const valuesList = $('dna-values');
    valuesList.innerHTML = '';

    if (!state.analysis.dna.available) {
      const text = svgEl('text', { x: 170, y: 170, 'text-anchor': 'middle', class: 'dna-label' });
      text.textContent = 'Not enough public data to build Developer DNA.';
      svg.appendChild(text);
      return;
    }

    const dims = state.analysis.dna.dims;
    const cx = 170, cy = 170, maxR = 130;
    const n = dims.length;
    const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;

    // grid rings
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const pts = dims.map((_, i) => {
        const a = angleFor(i);
        return `${cx + Math.cos(a) * maxR * f},${cy + Math.sin(a) * maxR * f}`;
      }).join(' ');
      svg.appendChild(svgEl('polygon', { points: pts, class: 'dna-axis', fill: 'none' }));
    });

    // axis lines + labels
    dims.forEach((d, i) => {
      const a = angleFor(i);
      const x2 = cx + Math.cos(a) * maxR, y2 = cy + Math.sin(a) * maxR;
      svg.appendChild(svgEl('line', { x1: cx, y1: cy, x2, y2, class: 'dna-axis' }));
      const lx = cx + Math.cos(a) * (maxR + 26), ly = cy + Math.sin(a) * (maxR + 26);
      const anchor = Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle';
      const label = svgEl('text', { x: lx, y: ly, 'text-anchor': anchor, class: 'dna-label' });
      label.textContent = d.label;
      svg.appendChild(label);
    });

    // data polygon
    const poly = svgEl('polygon', { class: 'dna-poly', points: '' });
    svg.appendChild(poly);
    dims.forEach((d, i) => {
      const a = angleFor(i);
      const r = (d.value / 100) * maxR;
      const dot = svgEl('circle', { cx: cx + Math.cos(a) * r, cy: cy + Math.sin(a) * r, r: 3.5, class: 'dna-dot' });
      svg.appendChild(dot);
    });

    if (state.settings.animations && !state.settings.reducedMotion) {
      let frame = 0;
      const totalFrames = 30;
      const animate = () => {
        frame++;
        const p = clamp(frame / totalFrames, 0, 1);
        const pts = dims.map((d, i) => {
          const a = angleFor(i);
          const r = (d.value / 100) * maxR * p;
          return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
        }).join(' ');
        poly.setAttribute('points', pts);
        if (p < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    } else {
      const pts = dims.map((d, i) => {
        const a = angleFor(i);
        const r = (d.value / 100) * maxR;
        return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
      }).join(' ');
      poly.setAttribute('points', pts);
    }

    dims.forEach(d => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'dna-dim-name'; name.textContent = d.label;
      const val = document.createElement('span');
      val.className = 'dna-dim-value'; val.textContent = d.value + '/100';
      li.appendChild(name); li.appendChild(val);
      valuesList.appendChild(li);
    });
  },

  renderSignals() {
    const list = $('signals-list');
    list.innerHTML = '';
    state.analysis.insights.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    });
  },

  // ---------------- LANGUAGE DNA ----------------
  renderLanguages() {
    const wrap = $('language-dna-bars');
    const emptyNote = $('language-empty');
    wrap.innerHTML = '';
    const stats = state.analysis.languageStats;
    if (!stats.available) {
      emptyNote.hidden = false;
      return;
    }
    emptyNote.hidden = true;
    stats.distribution.forEach(d => {
      const row = document.createElement('div');
      row.className = 'lang-bar-row';
      const nameWrap = document.createElement('div');
      nameWrap.className = 'lang-bar-name';
      const swatch = document.createElement('span');
      swatch.className = 'lang-swatch';
      swatch.style.background = colorForLanguage(d.lang);
      nameWrap.appendChild(swatch);
      const nameText = document.createElement('span');
      nameText.textContent = d.lang;
      nameWrap.appendChild(nameText);
      row.appendChild(nameWrap);

      const track = document.createElement('div');
      track.className = 'lang-bar-track';
      const fill = document.createElement('div');
      fill.className = 'lang-bar-fill';
      fill.style.background = colorForLanguage(d.lang);
      track.appendChild(fill);
      row.appendChild(track);

      const pct = document.createElement('span');
      pct.className = 'lang-bar-pct';
      pct.textContent = d.pct.toFixed(1) + '%';
      row.appendChild(pct);

      wrap.appendChild(row);
      requestAnimationFrame(() => { fill.style.width = d.pct + '%'; });
    });
  },

  renderLanguageOrbit() {
    const svg = $('language-orbit');
    svg.innerHTML = '';
    const stats = state.analysis.languageStats;
    if (!stats.available) return;

    const cx = 240, cy = 240;
    const center = svgEl('circle', { cx, cy, r: 26, fill: 'var(--surface-2)', stroke: 'var(--accent)', 'stroke-width': 1.5 });
    svg.appendChild(center);
    const centerText = svgEl('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', class: 'dna-label' });
    centerText.textContent = 'Dev';
    svg.appendChild(centerText);

    const radiusStep = 150;
    const maxNodeR = 34, minNodeR = 14;
    const maxPct = Math.max(...stats.distribution.map(d => d.pct));

    stats.distribution.forEach((d, i) => {
      const angle = (Math.PI * 2 * i) / stats.distribution.length - Math.PI / 2;
      const orbitR = radiusStep * (0.55 + (i % 2) * 0.45);
      const x = cx + Math.cos(angle) * orbitR;
      const y = cy + Math.sin(angle) * orbitR;
      const nodeR = minNodeR + (d.pct / maxPct) * (maxNodeR - minNodeR);

      const orbitPath = svgEl('circle', { cx, cy, r: orbitR, class: 'orbit-path' });
      svg.appendChild(orbitPath);

      const g = svgEl('g', { class: 'orbit-lang-node', tabindex: '0', role: 'button', 'aria-label': `${d.lang}, ${d.pct.toFixed(1)} percent` });
      const circle = svgEl('circle', { cx: x, cy: y, r: nodeR, fill: colorForLanguage(d.lang), opacity: 0.85 });
      g.appendChild(circle);
      const label = svgEl('text', { x, y: y + nodeR + 14, 'text-anchor': 'middle' });
      label.textContent = d.lang;
      g.appendChild(label);
      svg.appendChild(g);

      const repoCount = state.repos.filter(r => r.language === d.lang).length;
      const showTip = (evt) => {
        const point = evt.touches ? evt.touches[0] : evt;
        Tooltip.show(point.clientX, point.clientY, d.lang, [
          `Used across: ${repoCount || '—'} repositories`,
          `Relative presence: ${d.pct.toFixed(1)}%`
        ]);
      };
      g.addEventListener('mousemove', showTip);
      g.addEventListener('mouseleave', () => Tooltip.hide());
      g.addEventListener('focus', (e) => showTip(e));
      g.addEventListener('blur', () => Tooltip.hide());
    });
  },

  // ---------------- REPOSITORY UNIVERSE ----------------
  renderRepoUniverse() {
    const svg = $('repo-universe');
    svg.innerHTML = '';
    const repos = state.repos.slice(0, 40); // keep the universe legible
    if (!repos.length) return;

    const cx = 320, cy = 240;
    const maxOrbit = 210;
    const maxStars = Math.max(1, ...repos.map(r => r.stargazers_count || 0));

    // orbit rings for recency bands
    [60, 120, 180, 210].forEach(r => svg.appendChild(svgEl('circle', { cx, cy, r, class: 'orbit-path' })));

    repos.forEach((r, i) => {
      const daysOld = clamp(daysSince(r.pushed_at), 0, 1000);
      const orbitR = 40 + (daysOld / 1000) * maxOrbit;
      const angle = (Math.PI * 2 * i) / repos.length + i * 0.35;
      const x = cx + Math.cos(angle) * orbitR;
      const y = cy + Math.sin(angle) * orbitR * 0.72; // slight ellipse for depth

      const size = 4 + Math.sqrt((r.stargazers_count || 0) / maxStars) * 16;
      const color = colorForLanguage(r.language || 'Other');
      const glow = clamp(1 - daysOld / 400, 0.25, 1);

      const g = svgEl('a', { href: r.html_url, target: '_blank', rel: 'noopener noreferrer', class: 'planet', tabindex: '0' });
      const circle = svgEl('circle', { cx: x, cy: y, r: size, fill: color, opacity: glow });
      g.appendChild(circle);
      svg.appendChild(g);

      g.addEventListener('mousemove', (evt) => {
        Tooltip.show(evt.clientX, evt.clientY, r.name, [
          r.language || 'Unspecified language',
          `★ ${formatNumber(r.stargazers_count || 0)}  ⑂ ${formatNumber(r.forks_count || 0)}`,
          `Updated: ${formatRelativeTime(r.pushed_at)}`
        ]);
      });
      g.addEventListener('mouseleave', () => Tooltip.hide());
      g.addEventListener('focus', () => Tooltip.show(x + 200, y + 100, r.name, [r.language || '', `★ ${r.stargazers_count || 0}`]));
      g.addEventListener('blur', () => Tooltip.hide());
    });
  },

  // ---------------- REPOSITORY EXPLORER ----------------
  getFilteredSortedRepos() {
    let list = state.repos.slice();
    const f = state.filters;

    if (f.text) {
      const q = f.text.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q));
    }
    if (f.topic) {
      list = list.filter(r => (r.topics || []).includes(f.topic));
    }
    if (f.type === 'forks') list = list.filter(r => r.fork);
    else if (f.type === 'original') list = list.filter(r => !r.fork);
    else if (f.type === 'archived') list = list.filter(r => r.archived);
    else if (f.type === 'active') list = list.filter(r => daysSince(r.pushed_at) <= 90 && !r.archived);

    switch (f.sort) {
      case 'recent': list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'active': list.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at)); break;
      case 'starred': list.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)); break;
      case 'forked': list.sort((a, b) => (b.forks_count || 0) - (a.forks_count || 0)); break;
      case 'popular':
      default:
        list.sort((a, b) => (b.stargazers_count || 0) * 2 + (b.forks_count || 0) - ((a.stargazers_count || 0) * 2 + (a.forks_count || 0)));
    }
    return list;
  },

  renderRepoExplorer() {
    const grid = $('repo-grid');
    const countEl = $('repo-count');
    const loadMoreBtn = $('btn-load-more');
    grid.innerHTML = '';

    if (state.errors.repos && !state.repos.length) {
      countEl.textContent = 'Repository data is currently unavailable.';
      loadMoreBtn.hidden = true;
      return;
    }
    if (!state.repos.length) {
      countEl.textContent = 'No public repositories available.';
      loadMoreBtn.hidden = true;
      return;
    }

    const filtered = this.getFilteredSortedRepos();
    const visible = filtered.slice(0, state.visibleRepoCount);
    const totalKnown = state.reposTotalCount ?? state.repos.length;

    countEl.textContent = `Showing ${visible.length} of ${filtered.length} repositories` +
      (state.repos.length < totalKnown ? ` (analyzed ${state.repos.length} of ${totalKnown} total)` : '');

    visible.forEach(r => grid.appendChild(this.buildRepoCard(r)));

    loadMoreBtn.hidden = visible.length >= filtered.length;
  },

  buildRepoCard(r) {
    const card = document.createElement('article');
    card.className = 'repo-card';
    card.tabIndex = 0;

    const head = document.createElement('div');
    head.className = 'repo-card-head';
    const name = document.createElement('h4');
    name.className = 'repo-card-name';
    name.textContent = r.name;
    head.appendChild(name);

    const badges = document.createElement('div');
    badges.className = 'repo-badges';
    if (r.fork) badges.appendChild(makeBadge('Fork', 'badge-fork'));
    if (r.archived) badges.appendChild(makeBadge('Archived', 'badge-archived'));
    head.appendChild(badges);
    card.appendChild(head);

    const desc = document.createElement('p');
    desc.className = 'repo-card-desc';
    desc.textContent = r.description || 'No description provided.';
    card.appendChild(desc);

    const meta = document.createElement('div');
    meta.className = 'repo-card-meta';
    if (r.language) {
      const langSpan = document.createElement('span');
      const dot = document.createElement('span');
      dot.className = 'repo-lang-dot';
      dot.style.background = colorForLanguage(r.language);
      langSpan.appendChild(dot);
      langSpan.appendChild(document.createTextNode(r.language));
      meta.appendChild(langSpan);
    }
    meta.appendChild(makeSpan(`★ ${formatNumber(r.stargazers_count || 0)}`));
    meta.appendChild(makeSpan(`⑂ ${formatNumber(r.forks_count || 0)}`));
    card.appendChild(meta);

    const archetype = document.createElement('p');
    archetype.className = 'repo-card-archetype';
    archetype.textContent = `Likely archetype: ${Analyzer.classifyRepo(r)}`;
    card.appendChild(archetype);

    const footer = document.createElement('div');
    footer.className = 'repo-card-footer';
    const updated = document.createElement('span');
    updated.className = 'repo-card-updated';
    updated.textContent = `Updated ${formatRelativeTime(r.pushed_at)}`;
    footer.appendChild(updated);
    const link = document.createElement('a');
    link.className = 'repo-card-link';
    link.href = r.html_url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = 'View Repository ↗';
    link.addEventListener('click', (e) => e.stopPropagation());
    footer.appendChild(link);
    card.appendChild(footer);

    card.addEventListener('click', () => Modals.openRepo(r));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') Modals.openRepo(r); });

    function makeBadge(text, cls) {
      const b = document.createElement('span'); b.className = `badge ${cls}`; b.textContent = text; return b;
    }
    function makeSpan(text) { const s = document.createElement('span'); s.textContent = text; return s; }

    return card;
  },

  // ---------------- ACTIVITY PULSE ----------------
  renderActivity() {
    const list = $('activity-list');
    const emptyNote = $('activity-empty');
    const legend = $('activity-legend');
    list.innerHTML = ''; legend.innerHTML = '';

    const kindColor = {
      PushEvent: '#6EE7F2', PullRequestEvent: '#A78BFA', IssuesEvent: '#F2C46E',
      CreateEvent: '#7BE495', ForkEvent: '#f1e05a', WatchEvent: '#f34b7d', Other: '#8FA3B8'
    };
    const kindLabel = {
      PushEvent: 'Push', PullRequestEvent: 'Pull Request', IssuesEvent: 'Issue',
      CreateEvent: 'Repository Created', ForkEvent: 'Fork', WatchEvent: 'Star', Other: 'Other'
    };

    if (state.errors.events || !state.events.length) {
      emptyNote.hidden = false;
    } else {
      emptyNote.hidden = true;
      state.events.slice(0, 15).forEach(ev => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        const dot = document.createElement('span');
        dot.className = 'activity-dot';
        dot.style.background = kindColor[ev.type] || kindColor.Other;
        li.appendChild(dot);
        const when = document.createElement('span');
        when.className = 'activity-when';
        when.textContent = formatRelativeTime(ev.created_at);
        li.appendChild(when);
        const desc = document.createElement('span');
        desc.className = 'activity-desc';
        desc.textContent = `${kindLabel[ev.type] || ev.type.replace('Event', '')} · ${ev.repo ? ev.repo.name : ''}`;
        li.appendChild(desc);
        list.appendChild(li);
      });

      Object.keys(kindLabel).forEach(k => {
        const item = document.createElement('span');
        item.className = 'legend-item';
        const d = document.createElement('span');
        d.className = 'legend-dot'; d.style.background = kindColor[k];
        item.appendChild(d);
        item.appendChild(document.createTextNode(kindLabel[k]));
        legend.appendChild(item);
      });
    }

    this.renderRhythm();
  },

  renderRhythm() {
    const svg = $('rhythm-chart');
    svg.innerHTML = '';
    const rhythm = state.analysis.rhythm;
    const caption = $('rhythm-caption');
    const insightsList = $('rhythm-insights');
    insightsList.innerHTML = '';

    caption.textContent = rhythm.source === 'events'
      ? 'Based on available public activity (recent 30 days)'
      : 'Based on repository update recency — detailed public event history is unavailable';

    if (!rhythm.available) {
      const text = svgEl('text', { x: 320, y: 80, 'text-anchor': 'middle', class: 'dna-label' });
      text.textContent = 'Not enough recent public activity to plot a rhythm.';
      svg.appendChild(text);
      return;
    }

    // gradient def
    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: 'rhythmGrad', x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#6EE7F2' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#07111F', 'stop-opacity': 0 }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    const w = 640, h = 160, pad = 10;
    const max = Math.max(1, ...rhythm.buckets);
    const stepX = (w - pad * 2) / (rhythm.buckets.length - 1);
    const points = rhythm.buckets.map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - (v / max) * (h - pad * 2);
      return [x, y];
    });

    const linePath = 'M' + points.map(p => p.join(',')).join(' L');
    const areaPath = linePath + ` L${w - pad},${h - pad} L${pad},${h - pad} Z`;
    svg.appendChild(svgEl('path', { d: areaPath, class: 'rhythm-area' }));
    svg.appendChild(svgEl('path', { d: linePath, class: 'rhythm-line' }));

    // insights
    const total = rhythm.buckets.reduce((a, b) => a + b, 0);
    if (total > 0) {
      let longestStreak = 0, current = 0;
      rhythm.buckets.forEach(v => { if (v > 0) { current++; longestStreak = Math.max(longestStreak, current); } else current = 0; });
      addInsight('Longest visible activity streak', `${longestStreak} day${longestStreak === 1 ? '' : 's'}`);

      const recentHalf = rhythm.buckets.slice(15).reduce((a, b) => a + b, 0);
      const earlierHalf = rhythm.buckets.slice(0, 15).reduce((a, b) => a + b, 0);
      addInsight('Most active period', recentHalf >= earlierHalf ? 'Recent weeks' : 'Earlier in the window');

      if (rhythm.source === 'events' && state.events.length) {
        const counts = {};
        state.events.forEach(ev => { counts[ev.type] = (counts[ev.type] || 0) + 1; });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (top) addInsight('Most common event', top[0].replace('Event', ''));

        const dowCounts = {};
        state.events.forEach(ev => {
          const dow = new Date(ev.created_at).toLocaleDateString(undefined, { weekday: 'long' });
          dowCounts[dow] = (dowCounts[dow] || 0) + 1;
        });
        const topDow = Object.entries(dowCounts).sort((a, b) => b[1] - a[1])[0];
        if (topDow) addInsight('Most active day', topDow[0]);
      }
    }

    function addInsight(label, value) {
      const li = document.createElement('li');
      const l = document.createElement('span'); l.className = 'rhythm-insight-label'; l.textContent = label;
      const v = document.createElement('span'); v.className = 'rhythm-insight-value'; v.textContent = value;
      li.appendChild(l); li.appendChild(v);
      insightsList.appendChild(li);
    }
  },

  // ---------------- TIMELINE ----------------
  renderTimeline() {
    const wrap = $('timeline-wrap');
    wrap.innerHTML = '';
    const tl = state.analysis.timeline;
    if (!tl.available) {
      wrap.innerHTML = '<p class="empty-note">Not enough repository date information to build a timeline.</p>';
      return;
    }
    tl.years.forEach(({ year, repos }) => {
      const block = document.createElement('div');
      block.className = 'timeline-year';
      const label = document.createElement('p');
      label.className = 'timeline-year-label';
      label.textContent = year;
      block.appendChild(label);
      const list = document.createElement('div');
      list.className = 'timeline-repos';
      repos.forEach(r => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'timeline-repo-chip';
        chip.textContent = r.name;
        chip.title = `${r.language || 'Unspecified'} · created ${formatFullDate(r.created_at)}`;
        chip.addEventListener('click', () => Modals.openRepo(r));
        list.appendChild(chip);
      });
      block.appendChild(list);
      wrap.appendChild(block);
    });
  },

  renderThenVsNow() {
    const block = $('then-now-block');
    const grid = $('then-now-grid');
    const data = state.analysis.thenVsNow;
    if (!data.available) { block.hidden = true; return; }
    block.hidden = false;
    grid.innerHTML = '';

    grid.appendChild(buildCol('Earlier repositories', data.earlier));
    const arrow = document.createElement('div');
    arrow.className = 'then-now-arrow';
    arrow.textContent = '→';
    grid.appendChild(arrow);
    grid.appendChild(buildCol('Recent repositories', data.recent));

    function buildCol(title, d) {
      const col = document.createElement('div');
      col.className = 'then-now-col';
      const h4 = document.createElement('h4'); h4.textContent = title; col.appendChild(h4);
      const ul = document.createElement('ul');
      ul.innerHTML = `
        <li>Languages: ${d.languages.length ? d.languages.slice(0, 4).join(', ') : '—'}</li>
        <li>Avg. stars: ${d.avgStars}</li>
        <li>Distinct topics: ${d.topicCount}</li>
        <li>Repositories: ${d.count}</li>`;
      col.appendChild(ul);
      return col;
    }
  },

  renderEvolution() {
    const block = $('evolution-block');
    const list = $('evolution-list');
    const ev = state.analysis.evolution;
    if (!ev.available) { block.hidden = true; return; }
    block.hidden = false;
    list.innerHTML = '';
    const rows = [
      ['Started with', ev.startedWith],
      ['Expanded into', ev.expandedInto],
      ['Recently exploring', ev.recentlyExploring]
    ];
    rows.forEach(([label, langs]) => {
      if (!langs.length) return;
      const li = document.createElement('li');
      const tag = document.createElement('span'); tag.className = 'evolution-tag'; tag.textContent = label;
      const val = document.createElement('span'); val.className = 'evolution-val'; val.textContent = langs.join(', ');
      li.appendChild(tag); li.appendChild(val);
      list.appendChild(li);
    });
  },

  // ---------------- TOPIC GALAXY ----------------
  renderTopics() {
    const wrap = $('topic-galaxy');
    const emptyNote = $('topic-empty');
    wrap.innerHTML = '';
    const stats = state.analysis.topicStats;
    if (!stats.available) { emptyNote.hidden = false; return; }
    emptyNote.hidden = true;

    const max = Math.max(...stats.topics.map(t => t.count));
    stats.topics.slice(0, 24).forEach(t => {
      const scale = 0.85 + (t.count / max) * 0.9;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'topic-node' + (state.filters.topic === t.topic ? ' active' : '');
      btn.style.fontSize = (0.75 * scale) + 'rem';
      btn.style.padding = `${6 * scale}px ${14 * scale}px`;
      btn.textContent = t.topic;
      btn.title = `${t.count} repositor${t.count === 1 ? 'y' : 'ies'}`;
      btn.addEventListener('click', () => {
        state.filters.topic = state.filters.topic === t.topic ? null : t.topic;
        state.visibleRepoCount = CONFIG.REPO_PAGE_SIZE_UI;
        Renderer.renderTopics();
        Renderer.renderRepoExplorer();
        $('explorer-title').scrollIntoView({ behavior: state.settings.reducedMotion ? 'auto' : 'smooth' });
        showToast(state.filters.topic ? `Filtering repositories by topic "${t.topic}"` : 'Topic filter cleared');
      });
      wrap.appendChild(btn);
    });
  },

  // ---------------- COMMUNITY FOOTPRINT ----------------
  renderCommunity() {
    const svg = $('impact-ring');
    svg.innerHTML = '';
    const c = state.analysis.communityStats;
    const cx = 120, cy = 120;
    const rings = [
      { value: c.followers, cap: 500, color: 'var(--accent)', r: 100, label: 'Followers' },
      { value: c.starsReceived, cap: 2000, color: 'var(--accent-2)', r: 78, label: 'Stars received' },
      { value: c.forksReceived, cap: 500, color: 'var(--positive)', r: 56, label: 'Forks received' }
    ];
    rings.forEach(ring => {
      const circumference = 2 * Math.PI * ring.r;
      const pct = clamp(Math.log10(1 + ring.value) / Math.log10(1 + ring.cap), 0, 1);
      const bg = svgEl('circle', { cx, cy, r: ring.r, fill: 'none', stroke: 'var(--border)', 'stroke-width': 10 });
      svg.appendChild(bg);
      const fg = svgEl('circle', {
        cx, cy, r: ring.r, fill: 'none', stroke: ring.color, 'stroke-width': 10,
        'stroke-linecap': 'round', 'stroke-dasharray': circumference,
        'stroke-dashoffset': circumference * (1 - pct),
        transform: `rotate(-90 ${cx} ${cy})`
      });
      svg.appendChild(fg);
    });
    const centerText = svgEl('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', class: 'dna-label', fill: 'var(--text)' });
    centerText.textContent = 'Footprint';
    svg.appendChild(centerText);
    const subText = svgEl('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', class: 'dna-label' });
    subText.textContent = 'public reach';
    svg.appendChild(subText);

    const list = $('community-stats');
    list.innerHTML = '';
    [
      ['Followers', c.followers], ['Following', c.following], ['Stars received', c.starsReceived],
      ['Forks received', c.forksReceived], ['Public repos', c.publicRepos]
    ].forEach(([label, val]) => {
      const li = document.createElement('li');
      const num = document.createElement('span'); num.className = 'community-stat-num';
      const lbl = document.createElement('span'); lbl.className = 'community-stat-label'; lbl.textContent = label;
      li.appendChild(num); li.appendChild(lbl);
      list.appendChild(li);
      animateNumber(num, val);
    });
  },

  renderStarMap() {
    const list = $('star-map');
    const emptyNote = $('starmap-empty');
    list.innerHTML = '';
    const starred = state.repos.filter(r => (r.stargazers_count || 0) > 0).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 10);
    if (!starred.length) { emptyNote.hidden = false; return; }
    emptyNote.hidden = true;
    const maxLog = Math.log10(1 + starred[0].stargazers_count);
    starred.forEach(r => {
      const row = document.createElement('li');
      row.className = 'star-map-row';
      const barWrap = document.createElement('div');
      barWrap.className = 'star-map-bar-wrap';
      const bar = document.createElement('div');
      bar.className = 'star-map-bar';
      barWrap.appendChild(bar);
      const nameSpan = document.createElement('span');
      nameSpan.className = 'star-map-name';
      nameSpan.textContent = r.name;
      barWrap.appendChild(nameSpan);
      row.appendChild(barWrap);
      const countSpan = document.createElement('span');
      countSpan.className = 'star-map-count';
      countSpan.textContent = '★ ' + formatNumber(r.stargazers_count);
      row.appendChild(countSpan);
      list.appendChild(row);
      const pct = clamp((Math.log10(1 + r.stargazers_count) / maxLog) * 100, 6, 100);
      requestAnimationFrame(() => { bar.style.width = pct + '%'; });
    });
  },

  updateFavoriteButton() {
    const btn = $('btn-favorite');
    const isFav = FavoritesStore.isFavorite(state.user.login);
    btn.textContent = isFav ? '★ Remove from favorites' : '☆ Add to favorites';
  }
};

function escapeAlt(str) { return String(str).replace(/[<>&]/g, ''); }

/* ===========================================================
   MODALS
   =========================================================== */
const Modals = {
  openRepo(r) {
    $('repo-modal-title').textContent = r.name;
    const body = $('repo-modal-body');
    const badges = [];
    if (r.fork) badges.push('Fork');
    if (r.archived) badges.push('Archived');
    body.innerHTML = `
      <p style="color:var(--muted);margin-bottom:16px;">${r.description ? escapeHtml(r.description) : 'No description provided.'}</p>
      <dl>
        <dt>Created</dt><dd>${formatFullDate(r.created_at)}</dd>
        <dt>Updated</dt><dd>${formatFullDate(r.updated_at)}</dd>
        <dt>Language</dt><dd>${r.language || 'Unspecified'}</dd>
        <dt>Stars</dt><dd>${formatNumber(r.stargazers_count || 0)}</dd>
        <dt>Forks</dt><dd>${formatNumber(r.forks_count || 0)}</dd>
        <dt>Topics</dt><dd>${(r.topics || []).length ? r.topics.join(', ') : '—'}</dd>
        <dt>Status</dt><dd>${badges.length ? badges.join(', ') : 'Original, active'}</dd>
        <dt>Likely archetype</dt><dd>${Analyzer.classifyRepo(r)}</dd>
      </dl>
      <p style="margin-top:18px;"><a href="${r.html_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Open on GitHub ↗</a></p>
    `;
    openModal('repo-modal');
  }
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function openModal(id) {
  const el = $(id);
  el.hidden = false;
  const focusable = el.querySelector('button, input, a');
  if (focusable) focusable.focus();
  document.addEventListener('keydown', escCloseHandler);
}
function closeModal(id) {
  $(id).hidden = true;
  document.removeEventListener('keydown', escCloseHandler);
}
function escCloseHandler(e) {
  if (e.key === 'Escape') {
    ['repo-modal', 'transparency-modal', 'settings-modal'].forEach(id => { if (!$(id).hidden) closeModal(id); });
    if (!$('favorites-drawer').hidden) closeFavoritesDrawer();
  }
}

/* ===========================================================
   VIEW MANAGEMENT
   =========================================================== */
function showView(name) {
  ['landing', 'loading', 'error', 'results', 'compare'].forEach(v => {
    $(`view-${v}`).hidden = v !== name;
  });
  $('topbar').hidden = name === 'landing' && !state.searchHistory.length && !state.user;
  if (name !== 'landing') $('topbar').hidden = false;
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function showErrorView(kind, username) {
  const title = $('error-title');
  const msg = $('error-message');
  const icon = $('error-icon');
  if (kind === 'not_found') {
    icon.textContent = '◌';
    title.textContent = 'Developer not found';
    msg.textContent = `We couldn't find a public GitHub profile matching "@${username}". Check the spelling and try again.`;
  } else if (kind === 'rate_limit') {
    icon.textContent = '⧗';
    title.textContent = 'GitHub API limit reached';
    msg.textContent = 'The public GitHub API has temporarily limited requests. Please try again later.';
  } else if (kind === 'network' || kind === 'timeout') {
    icon.textContent = '⚠';
    title.textContent = 'Connection problem';
    msg.textContent = "We couldn't reach GitHub. Check your connection and try again.";
  } else if (kind === 'invalid') {
    icon.textContent = '?';
    title.textContent = 'That username isn\u2019t valid';
    msg.textContent = 'GitHub usernames use only letters, numbers and hyphens, and can\u2019t start or end with a hyphen.';
  } else {
    icon.textContent = '⚠';
    title.textContent = 'Something went wrong';
    msg.textContent = 'GitHub returned an unexpected response. Please try again.';
  }
  showView('error');
  $('error-search-input').focus();
}

/* ===========================================================
   SEARCH ORCHESTRATION
   =========================================================== */
async function performSearch(rawUsername, opts = {}) {
  const username = normalizeUsername(rawUsername);
  if (!validateUsername(username)) {
    showErrorView('invalid', username);
    return;
  }

  state.username = username;
  resetStages();
  showView('loading');

  const result = await loadFullProfile(username, opts);

  if (!result.ok) {
    const kind = result.error && result.error.kind === 'not_found' ? 'not_found'
      : result.error && result.error.kind === 'rate_limit' ? 'rate_limit'
      : result.error && (result.error.kind === 'network' || result.error.kind === 'timeout') ? 'network'
      : 'unknown';
    showErrorView(kind, username);
    return;
  }

  HistoryStore.add(state.user.login);
  renderHistoryPanel();

  if (!opts.skipUrlUpdate) {
    const url = `${location.pathname}?user=${encodeURIComponent(state.user.login)}`;
    history.pushState({ username: state.user.login }, '', url);
  }

  Renderer.renderAll();
  showView('results');

  if (result.fromCache) {
    showToast('Loaded from cache · Refresh for the latest data');
  }
}

/* ===========================================================
   HISTORY / FAVORITES PANELS
   =========================================================== */
function renderHistoryPanel() {
  const panel = $('history-panel');
  const list = $('history-list');
  state.searchHistory = HistoryStore.load();
  list.innerHTML = '';
  if (!state.searchHistory.length) { panel.hidden = true; return; }
  panel.hidden = false;
  state.searchHistory.forEach(username => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '@' + username;
    btn.addEventListener('click', () => performSearch(username));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'hist-remove';
    remove.setAttribute('aria-label', `Remove ${username} from history`);
    remove.textContent = '✕';
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      HistoryStore.remove(username);
      renderHistoryPanel();
    });
    btn.appendChild(remove);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function renderFavoritesDrawer() {
  const list = $('favorites-list');
  const emptyNote = $('favorites-empty');
  state.favorites = FavoritesStore.load();
  list.innerHTML = '';
  if (!state.favorites.length) { emptyNote.hidden = false; return; }
  emptyNote.hidden = true;
  state.favorites.forEach(f => {
    const li = document.createElement('li');
    li.className = 'favorite-row';
    if (f.avatarUrl) {
      const img = document.createElement('img');
      img.src = f.avatarUrl; img.alt = '';
      li.appendChild(img);
    }
    const btn = document.createElement('button');
    btn.className = 'fav-user';
    btn.textContent = '@' + f.username;
    btn.addEventListener('click', () => { closeFavoritesDrawer(); performSearch(f.username); });
    li.appendChild(btn);
    const remove = document.createElement('button');
    remove.className = 'fav-remove';
    remove.setAttribute('aria-label', `Remove ${f.username} from favorites`);
    remove.textContent = '✕';
    remove.addEventListener('click', () => { FavoritesStore.remove(f.username); renderFavoritesDrawer(); if (state.user) Renderer.updateFavoriteButton(); });
    li.appendChild(remove);
    list.appendChild(li);
  });
}
function openFavoritesDrawer() {
  renderFavoritesDrawer();
  $('favorites-drawer').hidden = false;
  document.addEventListener('keydown', escCloseHandler);
}
function closeFavoritesDrawer() {
  $('favorites-drawer').hidden = true;
}

/* ===========================================================
   EXPORT / SHARE / PRINT
   =========================================================== */
function exportSnapshot() {
  if (!state.user) return;
  const snapshot = {
    generatedBy: 'GitScope',
    generatedAt: new Date().toISOString(),
    username: state.user.login,
    profile: {
      name: state.user.name, bio: state.user.bio, location: state.user.location,
      company: state.user.company, followers: state.user.followers, following: state.user.following,
      publicRepos: state.user.public_repos, htmlUrl: state.user.html_url
    },
    snapshotLine: state.analysis.snapshot,
    developerDNA: state.analysis.dna,
    languageDistribution: state.analysis.languageStats,
    repositoryStats: state.analysis.repoStats,
    communityStats: state.analysis.communityStats,
    insights: state.analysis.insights
  };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `github-profile-analysis-${state.user.login}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Snapshot exported');
}

async function shareProfile() {
  const url = `${location.origin}${location.pathname}?user=${encodeURIComponent(state.user.login)}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: `GitScope — ${state.user.login}`, text: 'See this developer\u2019s public GitHub DNA on GitScope.', url });
      return;
    } catch (e) { /* user cancelled or share failed — fall through to copy */ }
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast('✓ Link copied');
  } catch (e) {
    showToast('Could not copy the link automatically. URL: ' + url);
  }
}

/* ===========================================================
   COMPARE VIEW
   =========================================================== */
async function fetchCompareProfile(rawUsername) {
  const username = normalizeUsername(rawUsername);
  if (!validateUsername(username)) return { ok: false, kind: 'invalid' };
  const cached = state.settings.useCache ? Cache.load(username) : null;
  if (cached) {
    return { ok: true, data: { user: cached.user, repos: cached.repos, events: cached.events, languageTotals: cached.languageTotals } };
  }
  const userRes = await GitHubAPI.getUser(username);
  if (!userRes.ok) return { ok: false, kind: userRes.kind };
  const repoRes = await GitHubAPI.getRepositories(username);
  const repos = repoRes.ok ? repoRes.data : [];
  const eventsRes = await GitHubAPI.getEvents(username);
  const events = eventsRes.ok ? eventsRes.data : [];

  let languageTotals = {};
  const topRepos = repos.filter(r => !r.fork).sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 6);
  for (const repo of topRepos) {
    const langRes = await GitHubAPI.getRepositoryLanguages(repo.owner.login, repo.name);
    if (langRes.ok) Object.entries(langRes.data).forEach(([lang, bytes]) => { languageTotals[lang] = (languageTotals[lang] || 0) + bytes; });
    else if (langRes.kind === 'rate_limit') break;
  }

  const payload = { user: userRes.data, repos, events, languageTotals, reposTotalCount: userRes.data.public_repos, errors: {}, fetchedAt: Date.now() };
  Cache.save(username, payload);
  return { ok: true, data: payload };
}

async function runCompare(userA, userB) {
  const errorEl = $('compare-error');
  const resultsEl = $('compare-results');
  errorEl.hidden = true;
  resultsEl.hidden = true;

  const [resA, resB] = await Promise.all([fetchCompareProfile(userA), fetchCompareProfile(userB)]);

  if (!resA.ok || !resB.ok) {
    const failed = !resA.ok ? userA : userB;
    const kind = (!resA.ok ? resA.kind : resB.kind);
    let msg = `Couldn't load @${failed}.`;
    if (kind === 'not_found') msg = `Developer not found: @${failed}.`;
    else if (kind === 'rate_limit') msg = 'GitHub API limit reached. Please try again later.';
    else if (kind === 'invalid') msg = `"@${failed}" isn\u2019t a valid GitHub username.`;
    errorEl.textContent = msg;
    errorEl.hidden = false;
    return;
  }

  const analysisA = Analyzer.analyze(resA.data);
  const analysisB = Analyzer.analyze(resB.data);
  state.compare = { a: { ...resA.data, analysis: analysisA }, b: { ...resB.data, analysis: analysisB } };
  renderCompareResults();
  resultsEl.hidden = false;
}

function compareWord(a, b, higherIsNotable = true) {
  if (a === b) return 'Similar';
  return a > b ? 'Higher' : 'Lower';
}

function renderCompareResults() {
  const { a, b } = state.compare;
  $('compare-col-a').textContent = '@' + a.user.login;
  $('compare-col-b').textContent = '@' + b.user.login;

  const rows = [
    ['Repositories', a.user.public_repos, b.user.public_repos],
    ['Followers', a.user.followers, b.user.followers],
    ['Following', a.user.following, b.user.following],
    ['Stars received', a.analysis.communityStats.starsReceived, b.analysis.communityStats.starsReceived],
    ['Forks received', a.analysis.communityStats.forksReceived, b.analysis.communityStats.forksReceived],
    ['Language diversity', a.analysis.languageStats.distinctCount || 0, b.analysis.languageStats.distinctCount || 0],
    ['Recently active repos', a.analysis.repoStats.activeRecently || 0, b.analysis.repoStats.activeRecently || 0]
  ];
  const tbody = $('compare-table-body');
  tbody.innerHTML = '';
  rows.forEach(([label, va, vb]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${label}</td><td>${formatNumber(va)}</td><td>${formatNumber(vb)}</td><td>${compareWord(va, vb)}</td>`;
    tbody.appendChild(tr);
  });

  renderCompareDNA(a, b);

  const reposCol = $('compare-repos');
  reposCol.innerHTML = '';
  [a, b].forEach(dev => {
    const col = document.createElement('div');
    col.className = 'compare-repos-col';
    const h4 = document.createElement('h4');
    h4.textContent = '@' + dev.user.login;
    col.appendChild(h4);
    const ul = document.createElement('ul');
    const top = dev.repos.slice().sort((x, y) => (y.stargazers_count || 0) - (x.stargazers_count || 0))[0];
    const recent = dev.repos.slice().sort((x, y) => new Date(y.created_at) - new Date(x.created_at))[0];
    const forked = dev.repos.slice().sort((x, y) => (y.forks_count || 0) - (x.forks_count || 0))[0];
    ul.innerHTML = `
      <li>Most starred: ${top ? escapeHtml(top.name) + ' (★ ' + formatNumber(top.stargazers_count || 0) + ')' : '—'}</li>
      <li>Most recent: ${recent ? escapeHtml(recent.name) : '—'}</li>
      <li>Most forked: ${forked ? escapeHtml(forked.name) + ' (⑂ ' + formatNumber(forked.forks_count || 0) + ')' : '—'}</li>
    `;
    col.appendChild(ul);
    reposCol.appendChild(col);
  });
}

function renderCompareDNA(a, b) {
  const svg = $('compare-dna-svg');
  svg.innerHTML = '';
  const legend = $('compare-dna-legend');
  legend.innerHTML = `
    <span><span class="legend-swatch" style="background:var(--accent)"></span>@${a.user.login}</span>
    <span><span class="legend-swatch" style="background:var(--accent-2)"></span>@${b.user.login}</span>`;

  if (!a.analysis.dna.available || !b.analysis.dna.available) {
    const text = svgEl('text', { x: 170, y: 170, 'text-anchor': 'middle', class: 'dna-label' });
    text.textContent = 'Not enough public data to compare Developer DNA.';
    svg.appendChild(text);
    return;
  }

  const dims = a.analysis.dna.dims;
  const cx = 170, cy = 170, maxR = 130;
  const n = dims.length;
  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;

  [0.25, 0.5, 0.75, 1].forEach(f => {
    const pts = dims.map((_, i) => { const ang = angleFor(i); return `${cx + Math.cos(ang) * maxR * f},${cy + Math.sin(ang) * maxR * f}`; }).join(' ');
    svg.appendChild(svgEl('polygon', { points: pts, class: 'dna-axis', fill: 'none' }));
  });
  dims.forEach((d, i) => {
    const ang = angleFor(i);
    svg.appendChild(svgEl('line', { x1: cx, y1: cy, x2: cx + Math.cos(ang) * maxR, y2: cy + Math.sin(ang) * maxR, class: 'dna-axis' }));
    const lx = cx + Math.cos(ang) * (maxR + 26), ly = cy + Math.sin(ang) * (maxR + 26);
    const anchor = Math.cos(ang) > 0.3 ? 'start' : Math.cos(ang) < -0.3 ? 'end' : 'middle';
    const label = svgEl('text', { x: lx, y: ly, 'text-anchor': anchor, class: 'dna-label' });
    label.textContent = d.label;
    svg.appendChild(label);
  });

  function polyFor(devDims, color) {
    const pts = devDims.map((d, i) => {
      const ang = angleFor(i);
      const r = (d.value / 100) * maxR;
      return `${cx + Math.cos(ang) * r},${cy + Math.sin(ang) * r}`;
    }).join(' ');
    return svgEl('polygon', { points: pts, fill: color, 'fill-opacity': 0.16, stroke: color, 'stroke-width': 2 });
  }
  svg.appendChild(polyFor(a.analysis.dna.dims, '#6EE7F2'));
  svg.appendChild(polyFor(b.analysis.dna.dims, '#A78BFA'));
}

/* ===========================================================
   SETTINGS
   =========================================================== */
function loadSettings() {
  const saved = SettingsStore.load();
  if (saved) state.settings = { ...state.settings, ...saved };
  $('toggle-animations').checked = state.settings.animations;
  $('toggle-reduced-motion').checked = state.settings.reducedMotion;
  $('toggle-cache').checked = state.settings.useCache;
  applyReducedMotionClass();
}
function applyReducedMotionClass() {
  document.body.classList.toggle('reduced-motion', state.settings.reducedMotion);
}
function saveSettings() { SettingsStore.save(state.settings); }

/* ===========================================================
   INITIALIZATION & EVENT WIRING
   =========================================================== */
function initializeApp() {
  if (window.__gitscopeInitialized) return;
  window.__gitscopeInitialized = true;
  Tooltip.init();
  loadSettings();
  state.searchHistory = HistoryStore.load();
  state.favorites = FavoritesStore.load();
  renderHistoryPanel();

  // Respect OS-level reduced motion preference on first load
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state.settings.reducedMotion = true;
    $('toggle-reduced-motion').checked = true;
    applyReducedMotionClass();
  }

  wireLandingSearch();
  wireTopbar();
  wireErrorSearch();
  wireRepoControls();
  wireHeaderActions();
  wireModals();
  wireFavoritesDrawer();
  wireSettingsModal();
  wireCompare();
  wireBrandHome();
  window.addEventListener('popstate', handlePopState);

  const params = new URLSearchParams(location.search);
  const userParam = params.get('user');
  if (userParam) {
    performSearch(userParam, { skipUrlUpdate: true });
  } else {
    showView('landing');
  }
}

function handlePopState() {
  const params = new URLSearchParams(location.search);
  const userParam = params.get('user');
  if (userParam) {
    performSearch(userParam, { skipUrlUpdate: true });
  } else {
    showView('landing');
  }
}

function wireLandingSearch() {
  $('landing-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = $('landing-search-input').value;
    const hint = $('search-hint');
    const normalized = normalizeUsername(val);
    if (!normalized) { hint.textContent = 'Enter a GitHub username to continue.'; return; }
    if (!validateUsername(normalized)) { hint.textContent = 'That doesn\u2019t look like a valid GitHub username.'; return; }
    hint.textContent = '';
    performSearch(normalized);
  });

  qsa('[data-example]').forEach(btn => {
    btn.addEventListener('click', () => performSearch(btn.dataset.example));
  });

  $('clear-history-btn').addEventListener('click', () => {
    HistoryStore.clear();
    renderHistoryPanel();
    showToast('Search history cleared');
  });
}

function wireErrorSearch() {
  $('error-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    performSearch($('error-search-input').value);
  });
}

function wireTopbar() {
  $('topbar-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('topbar-search-input');
    if (!input.value.trim()) return;
    performSearch(input.value);
    input.value = '';
  });
  $('btn-compare').addEventListener('click', () => { showView('compare'); });
  $('btn-favorites').addEventListener('click', openFavoritesDrawer);
  $('btn-settings').addEventListener('click', () => openModal('settings-modal'));
}

function wireBrandHome() {
  $('brand-home').addEventListener('click', () => {
    history.pushState({}, '', location.pathname);
    showView('landing');
  });
}

function wireHeaderActions() {
  $('btn-refresh').addEventListener('click', async () => {
    showToast('Refreshing data…');
    resetStages();
    showView('loading');
    const result = await loadFullProfile(state.username, { bypassCache: true });
    if (!result.ok) {
      showErrorView(result.error && result.error.kind === 'not_found' ? 'not_found' : 'unknown', state.username);
      return;
    }
    state.visibleRepoCount = CONFIG.REPO_PAGE_SIZE_UI;
    state.filters = { text: '', type: 'all', sort: 'popular', topic: null };
    Renderer.renderAll();
    showView('results');
    showToast('Updated just now');
  });

  $('btn-favorite').addEventListener('click', () => {
    const isFav = FavoritesStore.isFavorite(state.user.login);
    if (isFav) { FavoritesStore.remove(state.user.login); showToast('Removed from favorites'); }
    else { FavoritesStore.add(state.user.login, state.user.avatar_url); showToast('Added to favorites'); }
    Renderer.updateFavoriteButton();
  });

  $('btn-share').addEventListener('click', shareProfile);
  $('btn-export').addEventListener('click', exportSnapshot);
  $('btn-print').addEventListener('click', () => window.print());
  $('btn-open-compare').addEventListener('click', () => {
    showView('compare');
    $('compare-input-a').value = state.user ? state.user.login : '';
  });
}

function wireRepoControls() {
  const searchInput = $('repo-search-input');
  searchInput.addEventListener('input', debounce(() => {
    state.filters.text = searchInput.value.trim();
    state.visibleRepoCount = CONFIG.REPO_PAGE_SIZE_UI;
    Renderer.renderRepoExplorer();
  }, 220));

  qsa('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      qsa('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filters.type = chip.dataset.filter;
      state.visibleRepoCount = CONFIG.REPO_PAGE_SIZE_UI;
      Renderer.renderRepoExplorer();
    });
  });

  qsa('.radar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      qsa('.radar-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      state.filters.sort = tab.dataset.sort;
      state.visibleRepoCount = CONFIG.REPO_PAGE_SIZE_UI;
      Renderer.renderRepoExplorer();
    });
  });

  $('btn-load-more').addEventListener('click', () => {
    state.visibleRepoCount += CONFIG.REPO_PAGE_SIZE_UI;
    Renderer.renderRepoExplorer();
  });
}

function wireModals() {
  $('repo-modal-close').addEventListener('click', () => closeModal('repo-modal'));
  $('repo-modal').addEventListener('click', (e) => { if (e.target.id === 'repo-modal') closeModal('repo-modal'); });

  $('btn-transparency').addEventListener('click', () => openModal('transparency-modal'));
  $('transparency-close').addEventListener('click', () => closeModal('transparency-modal'));
  $('transparency-modal').addEventListener('click', (e) => { if (e.target.id === 'transparency-modal') closeModal('transparency-modal'); });
}

function wireFavoritesDrawer() {
  $('favorites-close').addEventListener('click', closeFavoritesDrawer);
  $('favorites-drawer').addEventListener('click', (e) => { if (e.target.id === 'favorites-drawer') closeFavoritesDrawer(); });
}

function wireSettingsModal() {
  $('settings-close').addEventListener('click', () => closeModal('settings-modal'));
  $('settings-modal').addEventListener('click', (e) => { if (e.target.id === 'settings-modal') closeModal('settings-modal'); });

  $('toggle-animations').addEventListener('change', (e) => { state.settings.animations = e.target.checked; saveSettings(); });
  $('toggle-reduced-motion').addEventListener('change', (e) => { state.settings.reducedMotion = e.target.checked; applyReducedMotionClass(); saveSettings(); });
  $('toggle-cache').addEventListener('change', (e) => { state.settings.useCache = e.target.checked; saveSettings(); });

  $('btn-clear-search-history').addEventListener('click', () => { HistoryStore.clear(); renderHistoryPanel(); showToast('Search history cleared'); });
  $('btn-clear-favorites').addEventListener('click', () => { FavoritesStore.clear(); if (state.user) Renderer.updateFavoriteButton(); showToast('Favorites cleared'); });
  $('btn-clear-cache').addEventListener('click', () => { Cache.clearAll(); showToast('Cached GitHub data cleared'); });
}

function wireCompare() {
  $('compare-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const a = $('compare-input-a').value, b = $('compare-input-b').value;
    if (!a.trim() || !b.trim()) { $('compare-error').hidden = false; $('compare-error').textContent = 'Enter two usernames to compare.'; return; }
    runCompare(a, b);
  });
}

document.addEventListener('DOMContentLoaded', initializeApp);
