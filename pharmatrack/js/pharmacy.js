/**
 * pharmacy.js — controllers for pharmacy-dashboard.html, inventory.html,
 * import.html, history.html. Each of these pages calls PTAuth.requireRole
 * ("pharmacy") before this script runs any rendering.
 */
(function (global) {
  "use strict";
  const U = global.PTUtils;
  const Store = global.PTStore;

  function currentPharmacyId() {
    const s = global.PTAuth.getSession();
    return s ? s.pharmacyId : null;
  }

  // ---------------- pharmacy-dashboard.html ----------------
  function initPharmacyDashboard() {
    const root = U.qs("#pharmacy-dash-root");
    if (!root) return;
    const pid = currentPharmacyId();
    const stats = Store.pharmacyStats(pid);
    const p = stats.pharmacy;

    U.qs("#dash-pharmacy-name").textContent = p ? p.pharmacy_name : "My Pharmacy";
    U.qs("#dash-total").textContent = U.formatNumber(stats.total);
    U.qs("#dash-available").textContent = U.formatNumber(stats.available);
    U.qs("#dash-low").textContent = U.formatNumber(stats.low);
    U.qs("#dash-out").textContent = U.formatNumber(stats.out);
    U.qs("#dash-freshness").innerHTML = p ? U.freshnessBadgeHTML(p.last_sync, { withWarning: true }) : "";

    // most requested medicines (system-wide search demand) that this pharmacy also carries
    const carriedIds = new Set(stats.rows.map((r) => r.medicine_id));
    const requested = Store.topSearchedMedicines(30).filter((r) => carriedIds.has(r.medicine.medicine_id)).slice(0, 5);
    const reqEl = U.qs("#dash-most-requested");
    if (reqEl) {
      reqEl.innerHTML = requested.length
        ? requested.map((r) => `<li class="list-inline-stat"><a href="medicine.html?id=${r.medicine.medicine_id}">${U.escapeHTML(r.medicine.brand_name)} ${U.escapeHTML(r.medicine.strength)}</a><span class="val">${U.formatNumber(r.count)}</span></li>`).join("")
        : `<li class="text-muted" style="padding:14px 0;">No search-demand overlap yet.</li>`;
    }

    // medicines at risk that this pharmacy carries
    const riskEl = U.qs("#dash-at-risk");
    if (riskEl) {
      const risky = Store.topShortageRisks(60).filter((r) => carriedIds.has(r.medicine.medicine_id)).slice(0, 5);
      riskEl.innerHTML = risky.length
        ? risky.map((r) => `<li class="list-inline-stat"><a href="medicine.html?id=${r.medicine.medicine_id}">${U.escapeHTML(r.medicine.brand_name)} ${U.escapeHTML(r.medicine.strength)}</a>${U.riskBadgeHTML(r.level)}</li>`).join("")
        : `<li class="text-muted" style="padding:14px 0;">No high-risk medicines detected.</li>`;
    }

    // inventory trend for this pharmacy (avg across its medicines with history)
    const pairSeries = new Map();
    stats.rows.forEach((r) => {
      const h = Store.historyForPair(pid, r.medicine_id);
      h.forEach((row) => {
        const d = new Date(row.recorded_at.replace(" ", "T"));
        const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!pairSeries.has(label)) pairSeries.set(label, { sum: 0, count: 0 });
        const b = pairSeries.get(label);
        b.sum += row.quantity;
        b.count++;
      });
    });
    const labels = [...pairSeries.keys()].sort();
    if (labels.length > 1 && global.PTCharts) {
      global.PTCharts.lineChart("dash-trend-chart", labels, [{ label: "Avg. inventory quantity", data: labels.map((l) => Math.round(pairSeries.get(l).sum / pairSeries.get(l).count)) }]);
    }

    const recentImports = Store.getImportLog().filter((l) => l.pharmacy_id === pid).slice(0, 3);
    const importEl = U.qs("#dash-recent-imports");
    if (importEl) {
      importEl.innerHTML = recentImports.length
        ? recentImports.map((l) => `<li class="list-inline-stat"><span>${U.escapeHTML(l.fileName)}</span><span class="val text-muted" style="font-weight:500;">${U.timeAgo(l.at.replace("T", " ").slice(0, 19))}</span></li>`).join("")
        : `<li class="text-muted" style="padding:14px 0;">No CSV imports yet. <a href="import.html">Import inventory →</a></li>`;
    }
  }

  // ---------------- inventory.html ----------------
  function initInventoryPage() {
    const tbody = U.qs("#inventory-body");
    if (!tbody) return;
    const pid = currentPharmacyId();
    const stats = Store.pharmacyStats(pid);
    U.qs("#inv-page-title").textContent = stats.pharmacy ? `${stats.pharmacy.pharmacy_name} — Inventory` : "Inventory";

    const search = U.qs("#inv-search");
    const statusFilter = U.qs("#inv-status-filter");
    let page = 1;
    const pageSize = 25;

    function render() {
      const q = search ? search.value.trim().toLowerCase() : "";
      const statusVal = statusFilter ? statusFilter.value : "";
      let rows = stats.rows.map((r) => ({ ...r, medicine: Store.getMedicineById(r.medicine_id) })).filter((r) => r.medicine);
      if (q) rows = rows.filter((r) => r.medicine.brand_name.toLowerCase().includes(q) || r.medicine.generic_name.toLowerCase().includes(q));
      if (statusVal) rows = rows.filter((r) => r.status === statusVal);
      rows.sort((a, b) => a.medicine.brand_name.localeCompare(b.medicine.brand_name));

      U.qs("#inv-count").textContent = `${rows.length} medicines`;
      const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      page = Math.min(page, totalPages);
      const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

      tbody.innerHTML = pageRows.length
        ? pageRows
            .map(
              (r) => `<tr>
              <td class="cell-strong">${U.escapeHTML(r.medicine.brand_name)} ${U.escapeHTML(r.medicine.strength)}</td>
              <td>${U.escapeHTML(r.medicine.dosage_form)}</td>
              <td class="cell-num">${r.quantity}</td>
              <td>${U.statusBadgeHTML(r.status)}</td>
              <td>${U.freshnessBadgeHTML(r.updated_at)}</td>
            </tr>`
            )
            .join("")
        : `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:30px;">No matching medicines.</td></tr>`;

      const pag = U.qs("#inv-pagination");
      if (pag) {
        let html = `<button ${page === 1 ? "disabled" : ""} data-page="${page - 1}">‹</button>`;
        for (let i = 1; i <= totalPages; i++) {
          if (totalPages > 8 && Math.abs(i - page) > 2 && i !== 1 && i !== totalPages) {
            if (i === 2 || i === totalPages - 1) html += `<span style="padding:0 4px;">…</span>`;
            continue;
          }
          html += `<button class="${i === page ? "active" : ""}" data-page="${i}">${i}</button>`;
        }
        html += `<button ${page === totalPages ? "disabled" : ""} data-page="${page + 1}">›</button>`;
        pag.innerHTML = html;
        U.qsa("button", pag).forEach((b) =>
          b.addEventListener("click", () => {
            page = Number(b.dataset.page);
            render();
          })
        );
      }
    }
    render();
    if (search) search.addEventListener("input", U.debounce(() => { page = 1; render(); }, 180));
    if (statusFilter) statusFilter.addEventListener("change", () => { page = 1; render(); });
  }

  // ---------------- history.html ----------------
  function initHistoryPage() {
    const select = U.qs("#history-medicine-select");
    if (!select) return;
    const pid = currentPharmacyId();
    const stats = Store.pharmacyStats(pid);
    const withHistory = stats.rows.filter((r) => Store.historyForPair(pid, r.medicine_id).length > 0);

    select.innerHTML = withHistory
      .map((r) => {
        const m = Store.getMedicineById(r.medicine_id);
        return m ? `<option value="${r.medicine_id}">${U.escapeHTML(m.brand_name)} ${U.escapeHTML(m.strength)}</option>` : "";
      })
      .join("");

    function renderChart() {
      const mid = select.value;
      const hist = Store.historyForPair(pid, mid);
      const labels = hist.map((h) => h.recorded_at.slice(0, 7));
      const values = hist.map((h) => h.quantity);
      if (global.PTCharts) global.PTCharts.lineChart("history-chart", labels, [{ label: "Quantity on hand", data: values, fill: true }]);

      const tbody = U.qs("#history-table-body");
      if (tbody) {
        tbody.innerHTML = hist
          .slice()
          .reverse()
          .map((h) => `<tr><td>${h.recorded_at}</td><td class="cell-num">${h.quantity}</td><td>${U.statusBadgeHTML(h.quantity <= 0 ? "OUT_OF_STOCK" : h.quantity < 20 ? "LOW_STOCK" : "AVAILABLE")}</td></tr>`)
          .join("");
      }
    }
    if (withHistory.length) {
      renderChart();
      select.addEventListener("change", renderChart);
    } else {
      U.qs("#history-empty")?.classList.remove("hidden");
    }
  }

  // ---------------- import.html ----------------
  function initImportPage() {
    const dropzone = U.qs("#import-dropzone");
    if (!dropzone) return;
    const fileInput = U.qs("#import-file-input");
    const pid = currentPharmacyId();
    let pipelineResult = null;
    let fileName = "";

    const steps = U.qsa(".step");
    function setStep(n) {
      steps.forEach((s, i) => {
        s.classList.toggle("done", i < n - 1);
        s.classList.toggle("current", i === n - 1);
      });
    }
    setStep(1);

    function handleFile(file) {
      fileName = file.name;
      setStep(2);
      const reader = new FileReader();
      reader.onload = () => {
        setStep(3);
        pipelineResult = global.PTImport.runPipeline(reader.result);
        setStep(4);
        renderPreview();
      };
      reader.readAsText(file);
    }

    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("drag-over"); });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) handleFile(fileInput.files[0]);
    });

    function renderPreview() {
      const r = pipelineResult;
      const summaryEl = U.qs("#import-summary");
      const tbody = U.qs("#import-preview-body");
      const commitBtn = U.qs("#import-commit-btn");
      U.qs("#import-results").classList.remove("hidden");

      summaryEl.innerHTML = `
        <div class="alert alert-success">✓ ${U.formatNumber(r.valid.length)} valid records ready to import</div>
        ${r.duplicates ? `<div class="alert alert-warning">⚠ ${r.duplicates} duplicate record${r.duplicates === 1 ? "" : "s"} skipped</div>` : ""}
        ${r.invalidQuantities ? `<div class="alert alert-error">⚠ ${r.invalidQuantities} invalid quantity/date value${r.invalidQuantities === 1 ? "" : "s"}</div>` : ""}
        ${r.missingFields ? `<div class="alert alert-error">⚠ ${r.missingFields} row${r.missingFields === 1 ? "" : "s"} with missing fields</div>` : ""}
        ${r.unmatched ? `<div class="alert alert-warning">⚠ ${r.unmatched} unmatched medicine name${r.unmatched === 1 ? "" : "s"} (not found in catalog)</div>` : ""}
      `;

      tbody.innerHTML = r.preview
        .slice(0, 30)
        .map((row) => {
          const ok = row.problems.length === 0 && row.match.medicine;
          const label = row.match.medicine ? `${row.match.medicine.brand_name} ${row.match.medicine.strength}` : "No catalog match";
          let issue = "—";
          if (row.problems.length) issue = row.problems.join(", ").replace(/_/g, " ");
          return `<tr>
            <td>${U.escapeHTML(row.rawName || "(empty)")}</td>
            <td>${U.escapeHTML(label)}</td>
            <td class="cell-num">${row.quantity === null ? "—" : row.quantity}</td>
            <td>${ok ? '<span class="badge badge-available">OK</span>' : `<span class="badge badge-out">${U.escapeHTML(issue)}</span>`}</td>
          </tr>`;
        })
        .join("");

      commitBtn.disabled = r.valid.length === 0;
      commitBtn.onclick = () => {
        Store.commitImport(pid, r.valid, {
          fileName,
          duplicateCount: r.duplicates,
          invalidCount: r.invalidQuantities,
          unmatchedCount: r.unmatched,
        });
        setStep(5);
        global.PTApp.toast(`Import complete — ${r.valid.length} records added to inventory.`, "success");
        commitBtn.disabled = true;
        commitBtn.textContent = "Imported ✓";
      };
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPharmacyDashboard();
    initInventoryPage();
    initHistoryPage();
    initImportPage();
  });
})(window);
