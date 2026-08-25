/**
 * admin.js — controllers for admin-dashboard.html, admin-pharmacies.html,
 * admin-medicines.html, admin-imports.html.
 */
(function (global) {
  "use strict";
  const U = global.PTUtils;
  const Store = global.PTStore;

  // ---------------- admin-dashboard.html ----------------
  function initAdminDashboard() {
    const root = U.qs("#admin-dash-root");
    if (!root) return;
    const s = Store.systemStats();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("adm-pharmacies", U.formatNumber(s.totalPharmacies));
    set("adm-active-pharmacies", U.formatNumber(s.activePharmacies));
    set("adm-pending-pharmacies", U.formatNumber(s.pendingPharmacies));
    set("adm-medicines", U.formatNumber(s.totalMedicines));
    set("adm-records", U.formatNumber(s.totalInventoryRecords));
    set("adm-low", U.formatNumber(s.lowStock));
    set("adm-out", U.formatNumber(s.outOfStock));
    set("adm-shortages", U.formatNumber(s.potentialShortages));

    const freshness = Store.pharmacyFreshnessBuckets();
    if (global.PTCharts) {
      global.PTCharts.doughnutChart(
        "adm-freshness-chart",
        ["Fresh (<1h)", "Recent (1-24h)", "Aging (1-7d)", "Outdated (>7d)"],
        [freshness.fresh, freshness.recent, freshness.aging, freshness.outdated],
        ["#16a06a", "#0197f6", "#b8790a", "#6a7c85"]
      );
    }

    const byCity = Store.availabilityByCity();
    if (global.PTCharts) {
      global.PTCharts.barChart("adm-city-chart", byCity.map((c) => c.city), byCity.map((c) => +(c.availabilityRate * 100).toFixed(1)), { color: "#0197f6" });
    }

    const trend = Store.shortageTrendSeries();
    if (global.PTCharts && trend.labels.length > 1) {
      global.PTCharts.lineChart("adm-shortage-trend-chart", trend.labels, [{ label: "% stockout snapshots", data: trend.values, fill: true }]);
    }

    const activityEl = U.qs("#adm-recent-activity");
    if (activityEl) {
      const log = Store.getImportLog().slice(0, 6);
      activityEl.innerHTML = log.length
        ? log.map((l) => {
            const ph = Store.getPharmacyById(l.pharmacy_id);
            return `<li class="list-inline-stat"><span>${ph ? U.escapeHTML(ph.pharmacy_name) : l.pharmacy_id} imported <strong>${l.fileName}</strong></span><span class="val text-muted" style="font-weight:500;">${U.timeAgo(l.at.replace("T"," ").slice(0,19))}</span></li>`;
          }).join("")
        : `<li class="text-muted" style="padding:14px 0;">No CSV imports recorded in this browser session yet.</li>`;
    }

    const riskTable = U.qs("#adm-risk-table-body");
    if (riskTable) {
      riskTable.innerHTML = Store.topShortageRisks(10)
        .map((r) => `<tr>
          <td class="cell-strong"><a href="medicine.html?id=${r.medicine.medicine_id}">${U.escapeHTML(r.medicine.brand_name)} ${U.escapeHTML(r.medicine.strength)}</a></td>
          <td>${U.escapeHTML(r.medicine.category)}</td>
          <td class="cell-num">${U.formatPercent(r.score, 0)}</td>
          <td>${U.riskBadgeHTML(r.level)}</td>
        </tr>`).join("");
    }
  }

  // ---------------- admin-pharmacies.html ----------------
  function initAdminPharmacies() {
    const tbody = U.qs("#adm-pharmacy-body");
    if (!tbody) return;
    const search = U.qs("#adm-pharmacy-search");
    const statusFilter = U.qs("#adm-pharmacy-status-filter");

    // pending status changes simulated in-memory only (demo — not persisted)
    const overrides = new Map();

    function render() {
      const q = search ? search.value.trim().toLowerCase() : "";
      const statusVal = statusFilter ? statusFilter.value : "";
      let list = Store.allPharmacies().map((p) => ({ ...p, status: overrides.get(p.pharmacy_id) || p.status }));
      if (q) list = list.filter((p) => p.pharmacy_name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q));
      if (statusVal) list = list.filter((p) => p.status === statusVal);

      U.qs("#adm-pharmacy-count").textContent = `${list.length} pharmacies`;
      tbody.innerHTML = list
        .slice(0, 80)
        .map((p) => {
          const stats = Store.pharmacyStats(p.pharmacy_id);
          const statusClass = p.status === "ACTIVE" ? "badge-available" : p.status === "PENDING" ? "badge-low" : "badge-unknown";
          return `<tr data-id="${p.pharmacy_id}">
            <td class="cell-strong">${U.escapeHTML(p.pharmacy_name)}</td>
            <td>${U.escapeHTML(p.city)}, ${U.escapeHTML(p.area)}</td>
            <td class="cell-num">${stats.total}</td>
            <td><span class="badge ${statusClass}">${p.status}</span></td>
            <td>${U.freshnessBadgeHTML(p.last_sync)}</td>
            <td class="row gap-8">
              ${p.status === "PENDING" ? `<button class="btn btn--sm btn--primary" data-action="approve">Approve</button>` : ""}
              ${p.status === "ACTIVE" ? `<button class="btn btn--sm btn--ghost" data-action="deactivate">Deactivate</button>` : ""}
              ${p.status === "INACTIVE" ? `<button class="btn btn--sm btn--ghost" data-action="activate">Activate</button>` : ""}
            </td>
          </tr>`;
        })
        .join("");

      U.qsa("button[data-action]", tbody).forEach((btn) => {
        btn.addEventListener("click", () => {
          const tr = btn.closest("tr");
          const id = tr.dataset.id;
          const action = btn.dataset.action;
          const next = action === "approve" || action === "activate" ? "ACTIVE" : "INACTIVE";
          overrides.set(id, next);
          global.PTApp.toast(`Pharmacy ${next === "ACTIVE" ? "activated" : "deactivated"} (demo — not persisted).`, "info");
          render();
        });
      });
    }
    render();
    if (search) search.addEventListener("input", U.debounce(render, 180));
    if (statusFilter) statusFilter.addEventListener("change", render);
  }

  // ---------------- admin-medicines.html ----------------
  function initAdminMedicines() {
    const tbody = U.qs("#adm-medicine-body");
    if (!tbody) return;
    const search = U.qs("#adm-medicine-search");
    const catFilter = U.qs("#adm-medicine-cat-filter");
    const categories = [...new Set(Store.allMedicines().map((m) => m.category))].sort();
    if (catFilter) catFilter.innerHTML = `<option value="">All categories</option>` + categories.map((c) => `<option value="${c}">${c}</option>`).join("");

    let page = 1;
    const pageSize = 20;

    function render() {
      const q = search ? search.value.trim().toLowerCase() : "";
      const cat = catFilter ? catFilter.value : "";
      let list = Store.allMedicines();
      if (q) list = list.filter((m) => m.brand_name.toLowerCase().includes(q) || m.generic_name.toLowerCase().includes(q));
      if (cat) list = list.filter((m) => m.category === cat);

      U.qs("#adm-medicine-count").textContent = `${list.length} medicines`;
      const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
      page = Math.min(page, totalPages);
      const pageRows = list.slice((page - 1) * pageSize, page * pageSize);

      tbody.innerHTML = pageRows
        .map((m) => {
          const summary = Store.medicineAvailabilitySummary(m.medicine_id);
          return `<tr>
            <td class="cell-strong"><a href="medicine.html?id=${m.medicine_id}">${U.escapeHTML(m.brand_name)}</a></td>
            <td>${U.escapeHTML(m.generic_name)}</td>
            <td>${U.escapeHTML(m.strength)}</td>
            <td>${U.escapeHTML(m.dosage_form)}</td>
            <td>${U.escapeHTML(m.category)}</td>
            <td class="cell-num">${summary.pharmaciesCount}</td>
            <td>${U.statusBadgeHTML(summary.overallStatus)}</td>
          </tr>`;
        })
        .join("");

      const pag = U.qs("#adm-medicine-pagination");
      if (pag) {
        let html = `<button ${page === 1 ? "disabled" : ""} data-page="${page - 1}">‹</button>`;
        for (let i = 1; i <= Math.min(totalPages, 10); i++) {
          html += `<button class="${i === page ? "active" : ""}" data-page="${i}">${i}</button>`;
        }
        html += `<button ${page === totalPages ? "disabled" : ""} data-page="${page + 1}">›</button>`;
        pag.innerHTML = html;
        U.qsa("button", pag).forEach((b) => b.addEventListener("click", () => { page = Number(b.dataset.page); render(); }));
      }
    }
    render();
    if (search) search.addEventListener("input", U.debounce(() => { page = 1; render(); }, 180));
    if (catFilter) catFilter.addEventListener("change", () => { page = 1; render(); });
  }

  // ---------------- admin-imports.html ----------------
  function initAdminImports() {
    const dq = U.qs("#adm-dq-root");
    if (!dq) return;
    const stats = Store.dataQualityStats();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("dq-processed", U.formatNumber(stats.processed));
    set("dq-valid", U.formatNumber(stats.valid));
    set("dq-duplicates", U.formatNumber(stats.duplicates));
    set("dq-missing", U.formatNumber(stats.missing));
    set("dq-unmatched", U.formatNumber(stats.unmatched));
    set("dq-invalid", U.formatNumber(stats.invalid));

    const bar = U.qs("#dq-valid-bar > span");
    if (bar) bar.style.width = U.formatPercent(stats.valid / stats.processed);

    const logEl = U.qs("#adm-import-log-body");
    if (logEl) {
      const log = Store.getImportLog();
      logEl.innerHTML = log.length
        ? log.map((l) => {
            const ph = Store.getPharmacyById(l.pharmacy_id);
            return `<tr>
              <td>${ph ? U.escapeHTML(ph.pharmacy_name) : l.pharmacy_id}</td>
              <td>${U.escapeHTML(l.fileName)}</td>
              <td class="cell-num">${l.validCount}</td>
              <td class="cell-num">${l.duplicateCount}</td>
              <td class="cell-num">${l.invalidCount}</td>
              <td class="cell-num">${l.unmatchedCount}</td>
              <td>${U.timeAgo(l.at.replace("T", " ").slice(0, 19))}</td>
            </tr>`;
          }).join("")
        : `<tr><td colspan="7" class="text-muted" style="text-align:center;padding:30px;">No imports have been committed in this browser yet. Try the <a href="import.html">pharmacy CSV import</a> demo.</td></tr>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initAdminDashboard();
    initAdminPharmacies();
    initAdminMedicines();
    initAdminImports();
  });
})(window);
