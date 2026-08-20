/**
 * charts.js
 * Responsible for rendering all SVG/CSS data visualizations.
 * Every function returns a DOM node (or appends into a container) built
 * from real, already-computed data — nothing here fabricates numbers.
 */

const Charts = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PALETTE = ['#FA6B40', '#B0C228', '#FAFCD9', '#535B1C', '#7A2E52', '#D98F3E'];

  function el(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function clear(container) {
    while (container.firstChild) container.removeChild(container.firstChild);
  }

  /**
   * Donut chart for language distribution, with an accessible legend.
   */
  function renderLanguageDonut(container, langDist) {
    clear(container);
    if (!langDist.entries.length) {
      container.innerHTML = '<p class="chart-empty">No language data is available for this profile.</p>';
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'lang-chart-wrap';

    const size = 180;
    const radius = 68;
    const strokeWidth = 26;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * radius;

    const svg = el('svg', {
      class: 'lang-donut',
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
      role: 'img',
      'aria-label': `Language distribution: ${langDist.entries.map((e) => `${e.name} ${e.pct}%`).join(', ')}`,
    });

    el('circle', { cx, cy, r: radius, fill: 'none', stroke: 'rgba(250,252,217,0.08)', 'stroke-width': strokeWidth }, svg);

    let offset = 0;
    langDist.entries.forEach((entry, i) => {
      const length = (entry.pct / 100) * circumference;
      const circle = el('circle', {
        cx, cy, r: radius,
        fill: 'none',
        stroke: PALETTE[i % PALETTE.length],
        'stroke-width': strokeWidth,
        'stroke-dasharray': `${length} ${circumference - length}`,
        'stroke-dashoffset': -offset,
        transform: `rotate(-90 ${cx} ${cy})`,
        'stroke-linecap': length < circumference ? 'butt' : 'round',
      });
      const title = el('title', {}, circle);
      title.textContent = `${entry.name}: ${entry.pct}%`;
      svg.appendChild(circle);
      offset += length;
    });

    const centerText = document.createElement('div');
    wrap.appendChild(svg);

    const legend = document.createElement('ul');
    legend.className = 'lang-legend';
    langDist.entries.forEach((entry, i) => {
      const li = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'lang-swatch';
      swatch.style.background = PALETTE[i % PALETTE.length];
      const name = document.createElement('span');
      name.textContent = entry.name;
      const pct = document.createElement('span');
      pct.className = 'lang-pct';
      pct.textContent = `${entry.pct}%`;
      li.appendChild(swatch);
      li.appendChild(name);
      li.appendChild(pct);
      legend.appendChild(li);
    });
    wrap.appendChild(legend);

    if (langDist.usedFallback) {
      const note = document.createElement('p');
      note.className = 'panel-sub';
      note.style.marginTop = '12px';
      note.textContent = 'Byte-level language data was unavailable; showing distribution by primary language instead.';
      wrap.appendChild(note);
    }

    container.appendChild(wrap);
  }

  /**
   * Horizontal bar rows — used for repo type breakdown and activity breakdown.
   */
  function renderBarRows(container, rows) {
    clear(container);
    if (!rows.length) {
      container.innerHTML = '<p class="chart-empty">No data available.</p>';
      return;
    }
    rows.forEach((row) => {
      const wrap = document.createElement('div');
      wrap.className = 'bar-row';

      const head = document.createElement('div');
      head.className = 'bar-row-head';
      const label = document.createElement('span');
      label.textContent = row.label;
      const value = document.createElement('span');
      value.textContent = `${row.pct}% (${row.count})`;
      head.appendChild(label);
      head.appendChild(value);

      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = `${row.pct}%`;
      fill.style.background = row.color;
      track.appendChild(fill);

      wrap.appendChild(head);
      wrap.appendChild(track);
      container.appendChild(wrap);
    });
  }

  /**
   * Weekly commit activity heatmap-style bar chart from
   * GET /repos/{owner}/{repo}/stats/commit_activity (last 10 weeks shown).
   */
  function renderCommitActivity(container, weeks, options) {
    clear(container);
    options = options || {};

    if (options.pending) {
      container.innerHTML = '<p class="commit-empty">Commit statistics are temporarily unavailable.</p>';
      return;
    }
    if (!weeks || !weeks.length) {
      container.innerHTML = '<p class="commit-empty">Commit statistics are temporarily unavailable.</p>';
      return;
    }

    const recentWeeks = weeks.slice(-10);
    const max = Math.max(1, ...recentWeeks.map((w) => w.total));
    const width = 560;
    const height = 140;
    const barGap = 6;
    const barWidth = (width - barGap * (recentWeeks.length - 1)) / recentWeeks.length;

    const svg = el('svg', {
      class: 'commit-chart-svg',
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': `Commits over the last ${recentWeeks.length} weeks, weekly totals ranging up to ${max}.`,
    });

    recentWeeks.forEach((w, i) => {
      const barHeight = Math.max(2, (w.total / max) * (height - 24));
      const x = i * (barWidth + barGap);
      const y = height - barHeight - 18;
      const rect = el('rect', {
        x, y, width: barWidth, height: barHeight,
        rx: 3,
        fill: w.total > 0 ? 'var(--burnt-peach)' : 'rgba(250,252,217,0.12)',
      });
      const title = el('title', {}, rect);
      const date = new Date(w.week * 1000);
      title.textContent = `Week of ${date.toLocaleDateString()}: ${w.total} commits`;
      svg.appendChild(rect);

      const label = el('text', {
        x: x + barWidth / 2, y: height - 4,
        'text-anchor': 'middle',
        'font-size': '8',
        fill: 'rgba(250,252,217,0.5)',
      });
      label.textContent = new Date(w.week * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      svg.appendChild(label);
    });

    container.appendChild(svg);
  }

  /**
   * Stars-by-repository horizontal bars, capped to top 10.
   */
  function renderStarsChart(container, repos) {
    clear(container);
    if (!repos.length) {
      container.innerHTML = '<p class="chart-empty">No starred repositories to display.</p>';
      return;
    }
    const max = Math.max(...repos.map((r) => r.stargazers_count || 0), 1);
    repos.forEach((repo) => {
      const row = document.createElement('div');
      row.className = 'stars-row';

      const name = document.createElement('span');
      name.className = 'stars-row-name';
      name.textContent = repo.name;
      name.title = repo.name;

      const track = document.createElement('div');
      track.className = 'stars-row-track';
      const fill = document.createElement('div');
      fill.className = 'stars-row-fill';
      fill.style.width = `${((repo.stargazers_count || 0) / max) * 100}%`;
      track.appendChild(fill);

      const value = document.createElement('span');
      value.className = 'stars-row-value';
      value.textContent = Analytics.formatCompactNumber(repo.stargazers_count || 0);

      row.appendChild(name);
      row.appendChild(track);
      row.appendChild(value);
      container.appendChild(row);
    });
  }

  return {
    PALETTE,
    renderLanguageDonut,
    renderBarRows,
    renderCommitActivity,
    renderStarsChart,
  };
})();
