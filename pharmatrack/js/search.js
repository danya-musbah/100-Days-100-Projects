/**
 * search.js — controllers for the public pages:
 * index.html, search.html, medicine.html, pharmacies.html, pharmacy-details.html
 */
(function (global) {
  "use strict";
  const U = global.PTUtils;
  const Store = global.PTStore;

  function medicineResultCard(m) {
    const summary = Store.medicineAvailabilitySummary(m.medicine_id);
    return `
      <a class="card result-card" href="medicine.html?id=${m.medicine_id}" style="display:block;text-decoration:none;margin-bottom:14px;">
        <div class="row" style="justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
          <div>
            <h4 style="margin-bottom:4px;">${U.escapeHTML(m.brand_name)} <span class="text-muted" style="font-weight:500;font-size:0.85em;">${U.escapeHTML(m.strength)}</span></h4>
            <div class="text-muted" style="font-size:0.85rem;">${U.escapeHTML(m.generic_name)} · ${U.escapeHTML(m.dosage_form)} · ${U.escapeHTML(m.category)}</div>
          </div>
          ${U.statusBadgeHTML(summary.overallStatus)}
        </div>
        <div class="row" style="justify-content:space-between;margin-top:16px;flex-wrap:wrap;gap:10px;">
          <div style="font-size:0.88rem;color:var(--text-body);">
            Available at <strong class="mono">${summary.available + summary.low}</strong> of ${summary.total} tracked pharmacies
          </div>
          ${summary.mostRecent ? U.freshnessBadgeHTML(summary.mostRecent) : '<span class="text-muted" style="font-size:0.8rem;">No data yet</span>'}
        </div>
      </a>`;
  }

  // ---------------- index.html ----------------
  function initLanding() {
    const form = U.qs("#hero-search-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = U.qs("#hero-search-input").value.trim();
        window.location.href = `search.html${q ? "?q=" + encodeURIComponent(q) : ""}`;
      });
    }
    U.qsa("[data-chip-query]").forEach((chip) => {
      chip.addEventListener("click", () => {
        window.location.href = `search.html?q=${encodeURIComponent(chip.dataset.chipQuery)}`;
      });
    });

    const stats = Store.systemStats();
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set("stat-pharmacies", U.formatNumber(stats.activePharmacies));
    set("stat-medicines", U.formatNumber(stats.totalMedicines));
    set("stat-records", U.formatNumber(stats.totalInventoryRecords));
    set("stat-searches", U.formatNumber(stats.totalSearches));
    set("stat-available-pct", U.formatPercent(stats.available / (stats.available + stats.lowStock + stats.outOfStock)));
    set("stat-shortages", U.formatNumber(stats.potentialShortages));

    const topList = U.qs("#top-searched-list");
    if (topList) {
      topList.innerHTML = Store.topSearchedMedicines(6)
        .map(
          (r) => `<li class="list-inline-stat"><a href="medicine.html?id=${r.medicine.medicine_id}">${U.escapeHTML(r.medicine.brand_name)} ${U.escapeHTML(r.medicine.strength)}</a><span class="val">${U.formatNumber(r.count)} searches</span></li>`
        )
        .join("");
    }

    const riskList = U.qs("#shortage-preview-list");
    if (riskList) {
      riskList.innerHTML = Store.topShortageRisks(5)
        .map(
          (r) => `<li class="list-inline-stat"><a href="medicine.html?id=${r.medicine.medicine_id}">${U.escapeHTML(r.medicine.brand_name)} ${U.escapeHTML(r.medicine.strength)}</a>${U.riskBadgeHTML(r.level)}</li>`
        )
        .join("");
    }
  }

  // ---------------- search.html ----------------
  function initSearchPage() {
    const input = U.qs("#search-input");
    const cityFilter = U.qs("#city-filter");
    const catFilter = U.qs("#category-filter");
    const resultsEl = U.qs("#results-list");
    const countEl = U.qs("#results-count");
    const emptyEl = U.qs("#results-empty");
    if (!resultsEl) return;

    // populate filters
    const cities = [...new Set(Store.allPharmacies().map((p) => p.city))].sort();
    if (cityFilter) cityFilter.innerHTML = `<option value="">All cities</option>` + cities.map((c) => `<option value="${c}">${c}</option>`).join("");
    const categories = [...new Set(Store.allMedicines().map((m) => m.category))].sort();
    if (catFilter) catFilter.innerHTML = `<option value="">All categories</option>` + categories.map((c) => `<option value="${c}">${c}</option>`).join("");

    function render() {
      const q = input.value.trim();
      let results = q ? Store.searchMedicines(q, { limit: 200 }) : Store.allMedicines().slice(0, 60);
      if (catFilter && catFilter.value) results = results.filter((m) => m.category === catFilter.value);
      if (cityFilter && cityFilter.value) {
        results = results.filter((m) => {
          const inv = Store.inventoryForMedicine(m.medicine_id);
          return inv.some((r) => {
            const ph = Store.getPharmacyById(r.pharmacy_id);
            return ph && ph.city === cityFilter.value;
          });
        });
      }
      countEl.textContent = q
        ? `${results.length} result${results.length === 1 ? "" : "s"} for "${U.escapeHTML(q)}"`
        : `Showing ${results.length} tracked medicines`;
      resultsEl.innerHTML = results.slice(0, 60).map(medicineResultCard).join("");
      emptyEl.classList.toggle("hidden", results.length > 0);
    }

    const qParam = U.getParam("q");
    if (qParam) input.value = qParam;
    input.addEventListener("input", U.debounce(render, 180));
    if (cityFilter) cityFilter.addEventListener("change", render);
    if (catFilter) catFilter.addEventListener("change", render);
    render();
  }

  // ---------------- medicine.html ----------------
  function initMedicinePage() {
    const root = U.qs("#medicine-detail-root");
    if (!root) return;
    const id = U.getParam("id");
    const m = Store.getMedicineById(id);
    if (!m) {
      root.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><h3>Medicine not found</h3><p>Try searching again from the medicine search page.</p><a class="btn btn--primary" href="search.html">Back to search</a></div>`;
      return;
    }
    const summary = Store.medicineAvailabilitySummary(id);
    const risk = Store.shortageRisk(id);
    document.title = `${m.brand_name} ${m.strength} — PharmaTrack`;

    U.qs("#med-title").textContent = `${m.brand_name} ${m.strength}`;
    U.qs("#med-sub").textContent = `${m.generic_name} · ${m.dosage_form} · ${m.category} · ${m.manufacturer}`;
    U.qs("#med-status-badge").innerHTML = U.statusBadgeHTML(summary.overallStatus);
    U.qs("#med-freshness").innerHTML = summary.mostRecent ? U.freshnessBadgeHTML(summary.mostRecent, { withWarning: true }) : "No inventory data reported yet.";
    U.qs("#med-pharmacy-count").textContent = U.formatNumber(summary.pharmaciesCount);
    U.qs("#med-available-count").textContent = U.formatNumber(summary.available);
    U.qs("#med-low-count").textContent = U.formatNumber(summary.low);
    U.qs("#med-out-count").textContent = U.formatNumber(summary.out);
    U.qs("#med-risk-badge").innerHTML = U.riskBadgeHTML(risk.level);

    const cityFilter = U.qs("#pharmacy-city-filter");
    const cities = [...new Set(Store.pharmaciesForMedicine(id).map((r) => r.pharmacy.city))].sort();
    if (cityFilter) cityFilter.innerHTML = `<option value="">All cities</option>` + cities.map((c) => `<option value="${c}">${c}</option>`).join("");

    function renderPharmacies() {
      const city = cityFilter ? cityFilter.value : "";
      const list = Store.pharmaciesForMedicine(id, { city: city || null });
      const tbody = U.qs("#pharmacy-availability-body");
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:30px;">No active pharmacies report this medicine in the selected area.</td></tr>`;
        return;
      }
      tbody.innerHTML = list
        .map(
          (r) => `<tr>
            <td><a href="pharmacy-details.html?id=${r.pharmacy.pharmacy_id}" class="cell-strong">${U.escapeHTML(r.pharmacy.pharmacy_name)}</a></td>
            <td>${U.escapeHTML(r.pharmacy.city)} · ${U.escapeHTML(r.pharmacy.area)}</td>
            <td>${U.statusBadgeHTML(r.inv.status)}</td>
            <td class="cell-num">${r.inv.status === "OUT_OF_STOCK" ? "—" : U.formatNumber(r.inv.quantity)}</td>
            <td>${U.freshnessBadgeHTML(r.inv.updated_at)}</td>
          </tr>`
        )
        .join("");
    }
    renderPharmacies();
    if (cityFilter) cityFilter.addEventListener("change", renderPharmacies);

    // history mini chart
    const hist = Store.inventoryTrendSeries(id);
    if (hist.labels.length > 1 && global.PTCharts) {
      global.PTCharts.lineChart("med-history-chart", hist.labels, [{ label: "Avg. quantity across pharmacies", data: hist.values }]);
    } else {
      const c = document.getElementById("med-history-chart");
      if (c) c.closest(".chart-canvas-wrap").innerHTML = `<div class="chart-fallback">Not enough historical snapshots for this medicine yet.</div>`;
    }

    // related / same category
    const related = Store.allMedicines().filter((r) => r.category === m.category && r.medicine_id !== m.medicine_id).slice(0, 4);
    const relatedEl = U.qs("#related-medicines");
    if (relatedEl) {
      relatedEl.innerHTML = related
        .map((r) => `<a class="chip light" href="medicine.html?id=${r.medicine_id}">${U.escapeHTML(r.brand_name)} ${U.escapeHTML(r.strength)}</a>`)
        .join("");
    }
  }

  // ---------------- pharmacies.html ----------------
  function initPharmaciesPage() {
    const listEl = U.qs("#pharmacy-list");
    if (!listEl) return;
    const cityFilter = U.qs("#directory-city-filter");
    const searchInput = U.qs("#directory-search");
    const cities = [...new Set(Store.allPharmacies().map((p) => p.city))].sort();
    if (cityFilter) cityFilter.innerHTML = `<option value="">All cities</option>` + cities.map((c) => `<option value="${c}">${c}</option>`).join("");

    function render() {
      let list = Store.allPharmacies().filter((p) => p.status === "ACTIVE");
      if (cityFilter && cityFilter.value) list = list.filter((p) => p.city === cityFilter.value);
      const q = searchInput ? searchInput.value.trim().toLowerCase() : "";
      if (q) list = list.filter((p) => p.pharmacy_name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q));
      U.qs("#directory-count").textContent = `${list.length} pharmacies`;
      listEl.innerHTML = list
        .slice(0, 120)
        .map((p) => {
          const stats = Store.pharmacyStats(p.pharmacy_id);
          return `<a class="card" href="pharmacy-details.html?id=${p.pharmacy_id}" style="display:block;text-decoration:none;margin-bottom:12px;">
            <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px;">
              <div>
                <h4 style="margin-bottom:2px;">${U.escapeHTML(p.pharmacy_name)}</h4>
                <div class="text-muted" style="font-size:0.85rem;">${U.escapeHTML(p.area)}, ${U.escapeHTML(p.city)}</div>
              </div>
              ${U.freshnessBadgeHTML(p.last_sync)}
            </div>
            <div class="row gap-16 mt-16" style="font-size:0.82rem;color:var(--text-muted);">
              <span><strong class="mono" style="color:var(--text-strong);">${stats.total}</strong> medicines tracked</span>
              <span><strong class="mono" style="color:var(--status-available);">${stats.available}</strong> available</span>
              <span><strong class="mono" style="color:var(--crimson);">${stats.out}</strong> out of stock</span>
            </div>
          </a>`;
        })
        .join("");
    }
    render();
    if (cityFilter) cityFilter.addEventListener("change", render);
    if (searchInput) searchInput.addEventListener("input", U.debounce(render, 180));
  }

  // ---------------- pharmacy-details.html ----------------
  function initPharmacyDetailsPage() {
    const root = U.qs("#pharmacy-detail-root");
    if (!root) return;
    const id = U.getParam("id");
    const p = Store.getPharmacyById(id);
    if (!p) {
      root.innerHTML = `<div class="empty-state"><div class="icon">🏥</div><h3>Pharmacy not found</h3><a class="btn btn--primary" href="pharmacies.html">Back to directory</a></div>`;
      return;
    }
    document.title = `${p.pharmacy_name} — PharmaTrack`;
    const stats = Store.pharmacyStats(id);
    U.qs("#ph-name").textContent = p.pharmacy_name;
    U.qs("#ph-location").textContent = `${p.area}, ${p.city}`;
    U.qs("#ph-address").textContent = p.address;
    U.qs("#ph-phone").textContent = p.phone;
    U.qs("#ph-freshness").innerHTML = U.freshnessBadgeHTML(p.last_sync, { withWarning: true });
    U.qs("#ph-total").textContent = U.formatNumber(stats.total);
    U.qs("#ph-available").textContent = U.formatNumber(stats.available);
    U.qs("#ph-low").textContent = U.formatNumber(stats.low);
    U.qs("#ph-out").textContent = U.formatNumber(stats.out);

    const search = U.qs("#ph-inventory-search");
    const tbody = U.qs("#ph-inventory-body");
    function render() {
      const q = search ? search.value.trim().toLowerCase() : "";
      let rows = stats.rows;
      if (q) rows = rows.filter((r) => {
        const med = Store.getMedicineById(r.medicine_id);
        return med && (med.brand_name.toLowerCase().includes(q) || med.generic_name.toLowerCase().includes(q));
      });
      rows = rows.slice().sort((a, b) => a.updated_at < b.updated_at ? 1 : -1).slice(0, 100);
      tbody.innerHTML = rows.map((r) => {
        const med = Store.getMedicineById(r.medicine_id);
        if (!med) return "";
        return `<tr>
          <td><a class="cell-strong" href="medicine.html?id=${med.medicine_id}">${U.escapeHTML(med.brand_name)} ${U.escapeHTML(med.strength)}</a></td>
          <td>${U.escapeHTML(med.dosage_form)}</td>
          <td>${U.statusBadgeHTML(r.status)}</td>
          <td>${U.freshnessBadgeHTML(r.updated_at)}</td>
        </tr>`;
      }).join("");
    }
    render();
    if (search) search.addEventListener("input", U.debounce(render, 180));

    // mini map link fallback
    const mapWrap = U.qs("#ph-map");
    if (mapWrap) {
      mapWrap.innerHTML = `<iframe title="Pharmacy location" style="width:100%;height:100%;border:0;" loading="lazy"
        src="https://www.openstreetmap.org/export/embed.html?bbox=${p.longitude-0.01}%2C${p.latitude-0.01}%2C${p.longitude+0.01}%2C${p.latitude+0.01}&layer=mapnik&marker=${p.latitude}%2C${p.longitude}"></iframe>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLanding();
    initSearchPage();
    initMedicinePage();
    initPharmaciesPage();
    initPharmacyDetailsPage();
  });
})(window);
