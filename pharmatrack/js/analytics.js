/**
 * analytics.js — controller for admin-analytics.html (deeper charts than
 * the summary admin dashboard: search demand, out-of-stock leaders,
 * category availability, inventory trend, shortage risk table).
 */
(function (global) {
  "use strict";
  const U = global.PTUtils;
  const Store = global.PTStore;

  function init() {
    const root = U.qs("#analytics-root");
    if (!root) return;
    const C = global.PTCharts;

    // 1. Medicine availability over time (system-wide)
    const trend = Store.inventoryTrendSeries();
    if (trend.labels.length > 1) C.lineChart("chart-availability-time", trend.labels, [{ label: "Avg. quantity on hand", data: trend.values, fill: true }]);

    // 2. Top medicines by search activity
    const top = Store.topSearchedMedicines(10);
    C.barChart("chart-top-searched", top.map((t) => `${t.medicine.brand_name} ${t.medicine.strength}`), top.map((t) => t.count), { horizontal: true, color: "#0197f6" });

    // 3. Most frequently out-of-stock medicines
    const outMeds = Store.mostOutOfStockMedicines(10);
    C.barChart("chart-most-out", outMeds.map((r) => `${r.medicine.brand_name} ${r.medicine.strength}`), outMeds.map((r) => +(r.ratio * 100).toFixed(0)), { horizontal: true, color: "#d7263d" });

    // 4. Availability by city
    const byCity = Store.availabilityByCity();
    C.stackedBarChart(
      "chart-by-city",
      byCity.map((c) => c.city),
      [
        { label: "Available", data: byCity.map((c) => c.available), color: "#16a06a" },
        { label: "Low stock", data: byCity.map((c) => c.low), color: "#b8790a" },
        { label: "Out of stock", data: byCity.map((c) => c.out), color: "#d7263d" },
      ]
    );

    // 5. Availability by category
    const byCat = Store.availabilityByCategory();
    C.stackedBarChart(
      "chart-by-category",
      byCat.map((c) => c.category),
      [
        { label: "Available", data: byCat.map((c) => c.available), color: "#16a06a" },
        { label: "Low stock", data: byCat.map((c) => c.low), color: "#b8790a" },
        { label: "Out of stock", data: byCat.map((c) => c.out), color: "#d7263d" },
      ]
    );

    // 6. Pharmacy data freshness
    const fresh = Store.pharmacyFreshnessBuckets();
    C.doughnutChart("chart-freshness", ["Fresh", "Recent", "Aging", "Outdated"], [fresh.fresh, fresh.recent, fresh.aging, fresh.outdated], ["#16a06a", "#0197f6", "#b8790a", "#6a7c85"]);

    // 7. Inventory trend (last 9 months, system total volume)
    const monthlyTotal = new Map();
    Store.RAW.history.forEach((r) => {
      const label = r.recorded_at.slice(0, 7);
      monthlyTotal.set(label, (monthlyTotal.get(label) || 0) + r.quantity);
    });
    const labels2 = [...monthlyTotal.keys()].sort();
    C.lineChart("chart-inventory-trend", labels2, [{ label: "Total quantity across sampled pairs", data: labels2.map((l) => monthlyTotal.get(l)) }]);

    // 8. Shortage trend over time
    const shortageTrend = Store.shortageTrendSeries();
    C.lineChart("chart-shortage-trend", shortageTrend.labels, [{ label: "% of snapshots at zero stock", data: shortageTrend.values, fill: true }]);

    // Shortage risk table
    const riskBody = U.qs("#analytics-risk-body");
    if (riskBody) {
      riskBody.innerHTML = Store.topShortageRisks(15)
        .map(
          (r) => `<tr>
          <td class="cell-strong"><a href="medicine.html?id=${r.medicine.medicine_id}">${U.escapeHTML(r.medicine.brand_name)} ${U.escapeHTML(r.medicine.strength)}</a></td>
          <td>${U.escapeHTML(r.medicine.category)}</td>
          <td class="cell-num">${r.features.pharmaciesCarrying}</td>
          <td class="cell-num">${U.formatPercent(r.features.outOfStockRatio)}</td>
          <td class="cell-num">${U.formatPercent(r.features.inventoryDeclineTrend)}</td>
          <td class="cell-num">${r.features.recentSearchVolume}</td>
          <td>${U.riskBadgeHTML(r.level)}</td>
        </tr>`
        )
        .join("");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
