/**
 * ui.js
 * Responsible for DOM updates: view switching, loading/error states,
 * dashboard rendering, modal interactions. No API calls live here.
 */

const UI = (() => {
  const views = {
    landing: document.getElementById('landing-view'),
    loading: document.getElementById('loading-view'),
    error: document.getElementById('error-view'),
    dashboard: document.getElementById('dashboard-view'),
  };

  function showView(name) {
    Object.keys(views).forEach((key) => {
      views[key].hidden = key !== name;
    });
    document.getElementById('refresh-btn').hidden = name !== 'dashboard';
  }

  function setLandingStatus(text) {
    document.getElementById('landing-status').textContent = text || '';
  }

  // ---- Loading stages ----

  const STAGE_ORDER = ['profile', 'repos', 'analytics', 'render'];

  function setLoadingStage(stageName) {
    const items = document.querySelectorAll('#loading-stages li');
    const idx = STAGE_ORDER.indexOf(stageName);
    items.forEach((li) => {
      const liStage = li.getAttribute('data-stage');
      const liIdx = STAGE_ORDER.indexOf(liStage);
      li.classList.remove('active', 'done');
      if (liIdx < idx) li.classList.add('done');
      else if (liIdx === idx) li.classList.add('active');
    });
  }

  // ---- Error view ----

  function showError(title, message) {
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    showView('error');
  }

  // ---- Toast ----

  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  }

  // ---- Recent profiles (landing) ----

  function renderRecentProfiles(list, onClick) {
    const wrap = document.getElementById('recent-profiles');
    const listEl = document.getElementById('recent-list');
    listEl.innerHTML = '';
    if (!list.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    list.forEach((username) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = username;
      btn.addEventListener('click', () => onClick(username));
      listEl.appendChild(btn);
    });
  }

  // ---- Rate limit status ----

  function renderRateLimit(rl) {
    const text = rl.limit
      ? `API requests ${rl.remaining} / ${rl.limit} remaining`
      : 'API requests — / —';
    document.getElementById('rate-status').textContent = text;
    document.getElementById('rate-status-detail').textContent = text;
  }

  // ---- Profile header ----

  function renderProfileHeader(user) {
    const container = document.getElementById('profile-header');
    container.innerHTML = '';

    const avatar = document.createElement('img');
    avatar.className = 'profile-avatar';
    avatar.src = user.avatar_url;
    avatar.alt = `${user.login} avatar`;
    avatar.width = 128;
    avatar.height = 128;

    const info = document.createElement('div');
    info.className = 'profile-info';

    const name = document.createElement('h1');
    name.className = 'profile-name';
    name.textContent = user.name || user.login;

    const username = document.createElement('p');
    username.className = 'profile-username';
    username.textContent = `@${user.login}`;

    info.appendChild(name);
    info.appendChild(username);

    if (user.bio) {
      const bio = document.createElement('p');
      bio.className = 'profile-bio';
      bio.textContent = user.bio;
      info.appendChild(bio);
    }

    const meta = document.createElement('div');
    meta.className = 'profile-meta';

    if (user.company) {
      const span = document.createElement('span');
      span.textContent = `🏢 ${user.company}`;
      meta.appendChild(span);
    }
    if (user.location) {
      const span = document.createElement('span');
      span.textContent = `📍 ${user.location}`;
      meta.appendChild(span);
    }
    if (user.blog) {
      const span = document.createElement('span');
      const link = document.createElement('a');
      const href = /^https?:\/\//.test(user.blog) ? user.blog : `https://${user.blog}`;
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = user.blog;
      span.appendChild(document.createTextNode('🔗 '));
      span.appendChild(link);
      meta.appendChild(span);
    }
    if (user.twitter_username) {
      const span = document.createElement('span');
      const link = document.createElement('a');
      link.href = `https://x.com/${user.twitter_username}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `@${user.twitter_username}`;
      span.appendChild(document.createTextNode('𝕏 '));
      span.appendChild(link);
      meta.appendChild(span);
    }
    if (user.created_at) {
      const span = document.createElement('span');
      const date = new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
      span.textContent = `📅 Joined ${date}`;
      meta.appendChild(span);
    }
    info.appendChild(meta);

    const cta = document.createElement('div');
    cta.className = 'profile-cta';
    const link = document.createElement('a');
    link.href = user.html_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'btn btn-primary';
    link.textContent = 'View on GitHub';
    cta.appendChild(link);

    container.appendChild(avatar);
    container.appendChild(info);
    container.appendChild(cta);
  }

  // ---- Glance bar ----

  function renderGlanceBar(summary) {
    const container = document.getElementById('glance-bar');
    container.innerHTML = '';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'glance-eyebrow';
    eyebrow.textContent = 'Your GitHub at a glance';
    container.appendChild(eyebrow);

    const items = [
      [summary.repoCount, 'repositories'],
      [Analytics.formatCompactNumber(summary.stars) + ' stars', ''],
      [summary.followers, 'followers'],
      [summary.languageCount, 'languages analyzed'],
    ];
    items.forEach(([value, label]) => {
      const span = document.createElement('span');
      span.className = 'glance-item';
      span.innerHTML = `<strong>${value}</strong>${label}`;
      container.appendChild(span);
    });

    if (summary.mostUsedLanguage) {
      const span = document.createElement('span');
      span.className = 'glance-item';
      span.innerHTML = `Most used: <strong style="font-size:1em;margin-right:0">${summary.mostUsedLanguage}</strong>`;
      container.appendChild(span);
    }
    if (summary.mostPopularRepo) {
      const span = document.createElement('span');
      span.className = 'glance-item';
      span.innerHTML = `Most popular: <strong style="font-size:1em;margin-right:0">${summary.mostPopularRepo}</strong>`;
      container.appendChild(span);
    }
  }

  // ---- Metrics grid ----

  function renderMetrics(metrics) {
    const container = document.getElementById('metrics-grid');
    container.innerHTML = '';
    const accents = ['var(--burnt-peach)', 'var(--lime-moss)', 'var(--light-yellow)', 'var(--burnt-peach)', 'var(--lime-moss)', 'var(--light-yellow)'];
    metrics.forEach((m, i) => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.style.setProperty('--accent', accents[i % accents.length]);
      const value = document.createElement('div');
      value.className = 'metric-value';
      value.textContent = m.value;
      const label = document.createElement('div');
      label.className = 'metric-label';
      label.textContent = m.label;
      card.appendChild(value);
      card.appendChild(label);
      container.appendChild(card);
    });
  }

  // ---- Repository cards ----

  function escapeText(str) { return str == null ? '' : String(str); }

  function buildRepoCard(repo, langColorMap) {
    const card = document.createElement('article');
    card.className = 'repo-card';

    const link = document.createElement('a');
    link.className = 'repo-card-name';
    link.href = repo.html_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = repo.name;
    card.appendChild(link);

    const desc = document.createElement('p');
    desc.className = 'repo-card-desc';
    desc.textContent = repo.description ? repo.description : 'No description provided.';
    card.appendChild(desc);

    const stats = document.createElement('div');
    stats.className = 'repo-card-stats';
    stats.innerHTML = `<span>★ ${Analytics.formatCompactNumber(repo.stargazers_count || 0)}</span><span>⑂ ${Analytics.formatCompactNumber(repo.forks_count || 0)}</span>`;
    card.appendChild(stats);

    const foot = document.createElement('div');
    foot.className = 'repo-card-foot';

    const langWrap = document.createElement('span');
    if (repo.language) {
      const dot = document.createElement('span');
      dot.className = 'repo-lang-dot';
      dot.style.background = langColorMap[repo.language] || 'var(--olive-leaf)';
      langWrap.appendChild(dot);
      langWrap.appendChild(document.createTextNode(repo.language));
    } else {
      langWrap.textContent = 'Unspecified language';
    }
    foot.appendChild(langWrap);

    const updated = document.createElement('span');
    updated.textContent = `Updated ${Analytics.formatRelativeTime(repo.pushed_at || repo.updated_at)}`;
    foot.appendChild(updated);

    card.appendChild(foot);

    const bottomRow = document.createElement('div');
    bottomRow.className = 'repo-card-foot';

    const health = document.createElement('span');
    health.className = 'repo-health';
    health.textContent = `Activity Score ${Analytics.repoHealth(repo)}`;
    health.title = 'An application-generated indicator, not an official GitHub metric.';
    bottomRow.appendChild(health);

    if (repo.license && repo.license.spdx_id && repo.license.spdx_id !== 'NOASSERTION') {
      const license = document.createElement('span');
      license.textContent = repo.license.spdx_id;
      bottomRow.appendChild(license);
    }

    card.appendChild(bottomRow);

    return card;
  }

  function renderRepoGrid(repos, langColorMap, append) {
    const grid = document.getElementById('repo-grid');
    if (!append) grid.innerHTML = '';
    if (!repos.length && !append) {
      grid.innerHTML = '<p class="chart-empty">No repositories match the current filters.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    repos.forEach((repo) => frag.appendChild(buildRepoCard(repo, langColorMap)));
    grid.appendChild(frag);
  }

  function renderRepoLangChips(languages, activeLang, onSelect) {
    const container = document.getElementById('repo-lang-chips');
    container.innerHTML = '';
    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'chip' + (activeLang === 'all' ? ' active' : '');
    all.textContent = 'All';
    all.addEventListener('click', () => onSelect('all'));
    container.appendChild(all);

    languages.forEach((lang) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (activeLang === lang ? ' active' : '');
      chip.textContent = lang;
      chip.addEventListener('click', () => onSelect(lang));
      container.appendChild(chip);
    });
  }

  function setLoadMoreVisible(visible) {
    document.getElementById('repo-loadmore').hidden = !visible;
  }

  // ---- Activity timeline ----

  function renderTimeline(events) {
    const container = document.getElementById('activity-timeline');
    container.innerHTML = '';
    if (!events.length) {
      container.innerHTML = '<p class="chart-empty">No recent public activity found.</p>';
      return;
    }
    const list = document.createElement('ul');
    list.className = 'timeline';
    events.slice(0, 10).forEach((event) => {
      const friendly = Analytics.friendlyEvent(event);
      const li = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = 'timeline-dot';
      const text = document.createElement('p');
      text.className = 'timeline-text';
      if (friendly.repoUrl) {
        const before = friendly.text.replace(friendly.repoName, '');
        text.textContent = before;
        const link = document.createElement('a');
        link.href = friendly.repoUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = friendly.repoName;
        text.appendChild(link);
      } else {
        text.textContent = friendly.text;
      }
      const time = document.createElement('p');
      time.className = 'timeline-time';
      time.textContent = Analytics.formatRelativeTime(friendly.time);

      li.appendChild(dot);
      li.appendChild(text);
      li.appendChild(time);
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  // ---- Insights ----

  function renderInsights(insights) {
    const container = document.getElementById('insights-list');
    container.innerHTML = '';
    if (!insights.length) {
      container.innerHTML = '<p class="chart-empty">Not enough data to generate insights yet.</p>';
      return;
    }
    const list = document.createElement('ul');
    list.className = 'insights-list';
    insights.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  // ---- Document title ----

  function setTitle(username) {
    document.title = username ? `GitHub Analytics — ${username}` : 'GitHub Analytics';
  }

  return {
    showView,
    setLandingStatus,
    setLoadingStage,
    showError,
    showToast,
    renderRecentProfiles,
    renderRateLimit,
    renderProfileHeader,
    renderGlanceBar,
    renderMetrics,
    renderRepoGrid,
    renderRepoLangChips,
    setLoadMoreVisible,
    renderTimeline,
    renderInsights,
    setTitle,
  };
})();
