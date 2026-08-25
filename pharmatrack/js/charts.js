/**
 * charts.js — thin wrapper around Chart.js (loaded from CDN in each page).
 */
(function (global) {
  "use strict";
  const U = global.PTUtils;

  const PALETTE = ["#0197f6", "#68c5db", "#448fa3", "#d7263d", "#16a06a", "#b8790a", "#7c5cff", "#02182b"];

  function hasChart() {
    return typeof global.Chart !== "undefined";
  }

  function fallbackBars(canvasEl, labels, values, { suffix = "" } = {}) {
    const wrap = canvasEl.closest(".chart-canvas-wrap") || canvasEl.parentElement;
    const max = Math.max(...values, 1);
    const rows = labels
      .map((label, i) => {
        const pct = Math.round((values[i] / max) * 100);
        return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:120px;font-size:0.78rem;color:var(--text-muted);flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${U.escapeHTML(label)}</div>
          <div class="progress-bar" style="flex:1;"><span style="width:${pct}%;"></span></div>
          <div style="width:56px;text-align:right;font-family:var(--font-mono);font-size:0.78rem;">${U.formatNumber(values[i])}${suffix}</div>
        </div>`;
      })
      .join("");
    wrap.innerHTML = `<div class="chart-fallback" style="text-align:left;padding:6px 0;">${rows}<div style="margin-top:8px;color:var(--text-muted);font-size:0.72rem;">Offline fallback view — connect to the internet to load interactive Chart.js visuals.</div></div>`;
  }

  function baseOptions(extra = {}) {
    return Object.assign(
      {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { family: "Inter" }, color: "#3c5866" } },
          tooltip: { titleFont: { family: "Inter" }, bodyFont: { family: "Inter" } },
        },
        scales: {
          x: { ticks: { font: { family: "Inter", size: 11 }, color: "#74909c" }, grid: { display: false } },
          y: { ticks: { font: { family: "Inter", size: 11 }, color: "#74909c" }, grid: { color: "#eef4f6" } },
        },
      },
      extra
    );
  }

  function lineChart(canvasId, labels, series, { yLabel = "" } = {}) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    if (!hasChart()) return fallbackBars(el, labels, series[0].data);
    new Chart(el, {
      type: "line",
      data: {
        labels,
        datasets: series.map((s, i) => ({
          label: s.label,
          data: s.data,
          borderColor: PALETTE[i % PALETTE.length],
          backgroundColor: PALETTE[i % PALETTE.length] + "22",
          fill: !!s.fill,
          tension: 0.35,
          pointRadius: 2,
          borderWidth: 2.4,
        })),
      },
      options: baseOptions({ scales: { x: baseOptions().scales.x, y: Object.assign(baseOptions().scales.y, { title: { display: !!yLabel, text: yLabel } }) } }),
    });
  }

  function barChart(canvasId, labels, values, { horizontal = false, color = PALETTE[0] } = {}) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    if (!hasChart()) return fallbackBars(el, labels, values);
    new Chart(el, {
      type: "bar",
      data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 6, maxBarThickness: 34 }] },
      options: baseOptions({
        indexAxis: horizontal ? "y" : "x",
        plugins: { legend: { display: false } },
      }),
    });
  }

  function stackedBarChart(canvasId, labels, datasets) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    if (!hasChart()) return fallbackBars(el, labels, datasets[0].data);
    new Chart(el, {
      type: "bar",
      data: {
        labels,
        datasets: datasets.map((d, i) => ({ label: d.label, data: d.data, backgroundColor: d.color || PALETTE[i % PALETTE.length], borderRadius: 4 })),
      },
      options: baseOptions({ scales: { x: Object.assign(baseOptions().scales.x, { stacked: true }), y: Object.assign(baseOptions().scales.y, { stacked: true }) } }),
    });
  }

  function doughnutChart(canvasId, labels, values, colors) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    if (!hasChart()) return fallbackBars(el, labels, values);
    new Chart(el, {
      type: "doughnut",
      data: { labels, datasets: [{ data: values, backgroundColor: colors || PALETTE, borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { family: "Inter", size: 11 } } } } },
    });
  }

  global.PTCharts = { lineChart, barChart, stackedBarChart, doughnutChart, hasChart, PALETTE };
})(window);
