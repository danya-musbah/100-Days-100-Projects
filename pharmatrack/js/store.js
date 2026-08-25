/**
 * store.js — the "service layer" of PharmaTrack.
 *
 * Every page reads data through PTStore instead of touching
 * window.PHARMATRACK_DATA directly.
 */
(function (global) {
  "use strict";
  const U = global.PTUtils;
  const RAW = global.PHARMATRACK_DATA || { pharmacies: [], medicines: [], inventory: [], history: [], searches: [] };

  // ---------------------------------------------------------------------
  // Merge in any CSV imports the user has committed this session/browser.
  // Persisted to localStorage so the pharmacy dashboard reflects imports
  // across page loads without a real backend.
  // ---------------------------------------------------------------------
  const IMPORT_STORE_KEY = "pharmatrack_committed_imports";
  const IMPORT_LOG_KEY = "pharmatrack_import_log";

  function loadCommittedImports() {
    try {
      const raw = localStorage.getItem(IMPORT_STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function saveCommittedImports(rows) {
    try {
      localStorage.setItem(IMPORT_STORE_KEY, JSON.stringify(rows));
    } catch (e) {
      /* storage full or unavailable — degrade silently for the demo */
    }
  }
  function getImportLog() {
    try {
      const raw = localStorage.getItem(IMPORT_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function appendImportLog(entry) {
    const log = getImportLog();
    log.unshift(entry);
    try {
      localStorage.setItem(IMPORT_LOG_KEY, JSON.stringify(log.slice(0, 50)));
    } catch (e) {}
  }

  RAW.inventory = RAW.inventory.concat(loadCommittedImports());

  /**
   * Commit newly-imported, already-normalized rows into the working
   * dataset and persist them so they survive a page reload.
   * `rows` shape: { pharmacy_id, medicine_id, quantity, status, updated_at }
   */
  function commitImport(pharmacyId, rows, meta = {}) {
    const stamped = rows.map((r, i) => ({
      inventory_id: `IMP-${Date.now()}-${i}`,
      pharmacy_id: pharmacyId,
      medicine_id: r.medicine_id,
      quantity: r.quantity,
      status: r.status,
      updated_at: r.updated_at,
    }));
    // replace existing rows for the same pharmacy+medicine, then append
    const filteredExisting = RAW.inventory.filter(
      (r) => !(r.pharmacy_id === pharmacyId && stamped.some((s) => s.medicine_id === r.medicine_id))
    );
    RAW.inventory = filteredExisting.concat(stamped);
    const persisted = loadCommittedImports().filter(
      (r) => !(r.pharmacy_id === pharmacyId && stamped.some((s) => s.medicine_id === r.medicine_id))
    );
    saveCommittedImports(persisted.concat(stamped));
    appendImportLog({
      pharmacy_id: pharmacyId,
      at: new Date().toISOString(),
      fileName: meta.fileName || "import.csv",
      validCount: rows.length,
      duplicateCount: meta.duplicateCount || 0,
      invalidCount: meta.invalidCount || 0,
      unmatchedCount: meta.unmatchedCount || 0,
    });
    rebuildIndices();
    return stamped;
  }

  // ---------------------------------------------------------------------
  // Indices
  // ---------------------------------------------------------------------
  const pharmaciesById = new Map();
  const medicinesById = new Map();
  const inventoryByMedicine = new Map();
  const inventoryByPharmacy = new Map();
  const historyByPair = new Map(); // key: pharmacyId|medicineId
  const historyByMedicine = new Map();
  const searchesByMedicine = new Map();

  function key2(a, b) {
    return a + "|" + b;
  }

  function rebuildIndices() {
    pharmaciesById.clear();
    medicinesById.clear();
    inventoryByMedicine.clear();
    inventoryByPharmacy.clear();
    historyByPair.clear();
    historyByMedicine.clear();
    searchesByMedicine.clear();

    RAW.pharmacies.forEach((p) => pharmaciesById.set(p.pharmacy_id, p));
    RAW.medicines.forEach((m) => medicinesById.set(m.medicine_id, m));

    RAW.inventory.forEach((row) => {
      if (!inventoryByMedicine.has(row.medicine_id)) inventoryByMedicine.set(row.medicine_id, []);
      inventoryByMedicine.get(row.medicine_id).push(row);
      if (!inventoryByPharmacy.has(row.pharmacy_id)) inventoryByPharmacy.set(row.pharmacy_id, []);
      inventoryByPharmacy.get(row.pharmacy_id).push(row);
    });

    RAW.history.forEach((row) => {
      const k = key2(row.pharmacy_id, row.medicine_id);
      if (!historyByPair.has(k)) historyByPair.set(k, []);
      historyByPair.get(k).push(row);
      if (!historyByMedicine.has(row.medicine_id)) historyByMedicine.set(row.medicine_id, []);
      historyByMedicine.get(row.medicine_id).push(row);
    });

    RAW.searches.forEach((row) => {
      if (!searchesByMedicine.has(row.medicine_id)) searchesByMedicine.set(row.medicine_id, []);
      searchesByMedicine.get(row.medicine_id).push(row);
    });

    // Pre-sort history chronologically for chart use
    historyByMedicine.forEach((arr) => arr.sort((a, b) => (a.recorded_at < b.recorded_at ? -1 : 1)));
    historyByPair.forEach((arr) => arr.sort((a, b) => (a.recorded_at < b.recorded_at ? -1 : 1)));
  }

  rebuildIndices();

  // ---------------------------------------------------------------------
  // Basic getters
  // ---------------------------------------------------------------------
  function getPharmacyById(id) {
    return pharmaciesById.get(id) || null;
  }
  function getMedicineById(id) {
    return medicinesById.get(id) || null;
  }
  function allPharmacies() {
    return RAW.pharmacies;
  }
  function allMedicines() {
    return RAW.medicines;
  }
  function inventoryForMedicine(id) {
    return inventoryByMedicine.get(id) || [];
  }
  function inventoryForPharmacy(id) {
    return inventoryByPharmacy.get(id) || [];
  }
  function historyForMedicine(id) {
    return historyByMedicine.get(id) || [];
  }
  function historyForPair(pid, mid) {
    return historyByPair.get(key2(pid, mid)) || [];
  }
  function searchesForMedicine(id) {
    return searchesByMedicine.get(id) || [];
  }

  // ---------------------------------------------------------------------
  // Medicine search (brand, generic, ingredient, strength, form)
  // ---------------------------------------------------------------------
  function searchMedicines(query, { limit = 40 } = {}) {
    const q = U.normalizeMedicineString(query || "");
    if (!q) return [];
    const terms = q.split(" ").filter(Boolean);
    const scored = [];
    RAW.medicines.forEach((m) => {
      const haystack = U.normalizeMedicineString(
        [m.brand_name, m.generic_name, m.active_ingredient, m.strength, m.dosage_form, m.category].join(" ")
      );
      let score = 0;
      if (haystack.includes(q)) score += 3;
      terms.forEach((t) => {
        if (haystack.includes(t)) score += 1;
      });
      score += U.similarity(query, m.brand_name) * 1.5;
      score += U.similarity(query, m.generic_name);
      if (score > 0) scored.push({ medicine: m, score });
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.medicine);
  }

  function medicineAvailabilitySummary(medicineId) {
    const inv = inventoryForMedicine(medicineId);
    const pharmaciesCount = new Set(inv.map((r) => r.pharmacy_id)).size;
    const available = inv.filter((r) => r.status === "AVAILABLE").length;
    const low = inv.filter((r) => r.status === "LOW_STOCK").length;
    const out = inv.filter((r) => r.status === "OUT_OF_STOCK").length;
    let mostRecent = null;
    inv.forEach((r) => {
      if (!mostRecent || r.updated_at > mostRecent) mostRecent = r.updated_at;
    });
    let overallStatus = "OUT_OF_STOCK";
    if (available > 0) overallStatus = "AVAILABLE";
    else if (low > 0) overallStatus = "LOW_STOCK";
    if (inv.length === 0) overallStatus = "UNKNOWN";
    return { pharmaciesCount, available, low, out, mostRecent, overallStatus, total: inv.length };
  }

  // ---------------------------------------------------------------------
  // Pharmacies with joined inventory rows for a medicine
  // ---------------------------------------------------------------------
  function pharmaciesForMedicine(medicineId, { city = null } = {}) {
    const rows = inventoryForMedicine(medicineId);
    let joined = rows
      .map((r) => ({ inv: r, pharmacy: getPharmacyById(r.pharmacy_id) }))
      .filter((r) => r.pharmacy && r.pharmacy.status === "ACTIVE");
    if (city) joined = joined.filter((r) => r.pharmacy.city === city);
    joined.sort((a, b) => {
      const rank = { AVAILABLE: 0, LOW_STOCK: 1, OUT_OF_STOCK: 2 };
      if (rank[a.inv.status] !== rank[b.inv.status]) return rank[a.inv.status] - rank[b.inv.status];
      return b.inv.updated_at.localeCompare(a.inv.updated_at);
    });
    return joined;
  }

  // ---------------------------------------------------------------------
  // Shortage risk — transparent rule-based "Demo Prediction"
  // Mirrors the features a real scikit-learn model would use (section 17/18)
  // ---------------------------------------------------------------------
  function shortageRisk(medicineId) {
    const inv = inventoryForMedicine(medicineId);
    const searches = searchesForMedicine(medicineId);
    const hist = historyForMedicine(medicineId);
    const medicine = getMedicineById(medicineId);

    const totalPharmacies = new Set(inv.map((r) => r.pharmacy_id)).size;
    const outCount = inv.filter((r) => r.status === "OUT_OF_STOCK").length;
    const lowCount = inv.filter((r) => r.status === "LOW_STOCK").length;
    const outRatio = inv.length ? outCount / inv.length : 0;
    const lowRatio = inv.length ? lowCount / inv.length : 0;

    // recent search activity (last 30 days) vs prior period -> demand pressure
    const recent = searches.filter((s) => U.hoursSince(s.searched_at) <= 24 * 30).length;
    const prior = searches.filter((s) => {
      const h = U.hoursSince(s.searched_at);
      return h > 24 * 30 && h <= 24 * 60;
    }).length;
    const searchPressure = recent / Math.max(1, prior === 0 ? recent || 1 : prior);
    const searchVolumeScore = Math.min(1, recent / 40);

    // trend: average quantity in earliest vs latest 2 history points
    let trendScore = 0;
    if (hist.length >= 2) {
      const first = hist.slice(0, 2).reduce((s, r) => s + r.quantity, 0) / 2;
      const last = hist.slice(-2).reduce((s, r) => s + r.quantity, 0) / 2;
      if (first > 0) {
        const decline = (first - last) / first;
        trendScore = Math.max(0, Math.min(1, decline));
      } else if (last === 0) {
        trendScore = 0.5;
      }
    }

    const fewPharmaciesScore = totalPharmacies === 0 ? 1 : Math.max(0, Math.min(1, 1 - totalPharmacies / 25));

    // weighted composite (documented "feature weights" for the demo model)
    const compositeRaw =
      outRatio * 0.32 +
      lowRatio * 0.12 +
      trendScore * 0.24 +
      Math.min(1, searchVolumeScore) * 0.16 +
      fewPharmaciesScore * 0.16;

    const composite = Math.max(0, Math.min(1, compositeRaw));

    let level = "LOW";
    if (composite >= 0.52) level = "HIGH";
    else if (composite >= 0.3) level = "MEDIUM";

    return {
      medicine,
      level,
      score: composite,
      features: {
        outOfStockRatio: outRatio,
        lowStockRatio: lowRatio,
        inventoryDeclineTrend: trendScore,
        recentSearchVolume: recent,
        pharmaciesCarrying: totalPharmacies,
      },
    };
  }

  function topShortageRisks(limit = 12) {
    const results = RAW.medicines.map((m) => shortageRisk(m.medicine_id));
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  // ---------------------------------------------------------------------
  // Analytics aggregates
  // ---------------------------------------------------------------------
  function topSearchedMedicines(limit = 10, days = null) {
    const counts = new Map();
    RAW.searches.forEach((s) => {
      if (days && U.hoursSince(s.searched_at) > days * 24) return;
      counts.set(s.medicine_id, (counts.get(s.medicine_id) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([id, count]) => ({ medicine: getMedicineById(id), count }))
      .filter((r) => r.medicine)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  function mostOutOfStockMedicines(limit = 10) {
    return RAW.medicines
      .map((m) => {
        const inv = inventoryForMedicine(m.medicine_id);
        const out = inv.filter((r) => r.status === "OUT_OF_STOCK").length;
        return { medicine: m, outCount: out, total: inv.length, ratio: inv.length ? out / inv.length : 0 };
      })
      .filter((r) => r.total >= 3)
      .sort((a, b) => b.ratio - a.ratio || b.outCount - a.outCount)
      .slice(0, limit);
  }

  function availabilityByCity() {
    const map = new Map();
    RAW.inventory.forEach((row) => {
      const ph = getPharmacyById(row.pharmacy_id);
      if (!ph) return;
      if (!map.has(ph.city)) map.set(ph.city, { available: 0, low: 0, out: 0, total: 0 });
      const bucket = map.get(ph.city);
      bucket.total++;
      if (row.status === "AVAILABLE") bucket.available++;
      else if (row.status === "LOW_STOCK") bucket.low++;
      else bucket.out++;
    });
    return [...map.entries()].map(([city, v]) => ({
      city,
      ...v,
      availabilityRate: v.total ? v.available / v.total : 0,
    })).sort((a, b) => b.availabilityRate - a.availabilityRate);
  }

  function availabilityByCategory() {
    const map = new Map();
    RAW.inventory.forEach((row) => {
      const med = getMedicineById(row.medicine_id);
      if (!med) return;
      if (!map.has(med.category)) map.set(med.category, { available: 0, low: 0, out: 0, total: 0 });
      const bucket = map.get(med.category);
      bucket.total++;
      if (row.status === "AVAILABLE") bucket.available++;
      else if (row.status === "LOW_STOCK") bucket.low++;
      else bucket.out++;
    });
    return [...map.entries()].map(([category, v]) => ({
      category,
      ...v,
      availabilityRate: v.total ? v.available / v.total : 0,
    })).sort((a, b) => b.availabilityRate - a.availabilityRate);
  }

  function pharmacyFreshnessBuckets() {
    const buckets = { fresh: 0, recent: 0, aging: 0, outdated: 0 };
    RAW.pharmacies.forEach((p) => {
      if (p.status !== "ACTIVE") return;
      buckets[U.freshnessTier(p.last_sync)]++;
    });
    return buckets;
  }

  /** Aggregate inventory quantity trend over the last N months (system-wide or by medicineId). */
  function inventoryTrendSeries(medicineId = null) {
    const source = medicineId ? historyForMedicine(medicineId) : RAW.history;
    const byMonth = new Map();
    source.forEach((r) => {
      const d = new Date(r.recorded_at.replace(" ", "T"));
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth.has(label)) byMonth.set(label, { sum: 0, count: 0 });
      const b = byMonth.get(label);
      b.sum += r.quantity;
      b.count += 1;
    });
    const labels = [...byMonth.keys()].sort();
    return {
      labels,
      values: labels.map((l) => Math.round(byMonth.get(l).sum / Math.max(1, byMonth.get(l).count))),
    };
  }

  function shortageTrendSeries() {
    // % of history snapshots per month with quantity 0 (system-wide stockout trend)
    const byMonth = new Map();
    RAW.history.forEach((r) => {
      const d = new Date(r.recorded_at.replace(" ", "T"));
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth.has(label)) byMonth.set(label, { zero: 0, total: 0 });
      const b = byMonth.get(label);
      b.total++;
      if (r.quantity === 0) b.zero++;
    });
    const labels = [...byMonth.keys()].sort();
    return {
      labels,
      values: labels.map((l) => {
        const b = byMonth.get(l);
        return b.total ? +(100 * b.zero / b.total).toFixed(1) : 0;
      }),
    };
  }

  // ---------------------------------------------------------------------
  // System-wide KPI rollups
  // ---------------------------------------------------------------------
  function systemStats() {
    const activePharmacies = RAW.pharmacies.filter((p) => p.status === "ACTIVE").length;
    const pendingPharmacies = RAW.pharmacies.filter((p) => p.status === "PENDING").length;
    const available = RAW.inventory.filter((r) => r.status === "AVAILABLE").length;
    const low = RAW.inventory.filter((r) => r.status === "LOW_STOCK").length;
    const out = RAW.inventory.filter((r) => r.status === "OUT_OF_STOCK").length;
    const risks = topShortageRisks(9999);
    const highRisk = risks.filter((r) => r.level === "HIGH").length;
    return {
      totalPharmacies: RAW.pharmacies.length,
      activePharmacies,
      pendingPharmacies,
      totalMedicines: RAW.medicines.length,
      totalInventoryRecords: RAW.inventory.length,
      available,
      lowStock: low,
      outOfStock: out,
      potentialShortages: highRisk,
      totalSearches: RAW.searches.length,
      totalHistoryRecords: RAW.history.length,
    };
  }

  function pharmacyStats(pharmacyId) {
    const inv = inventoryForPharmacy(pharmacyId);
    const available = inv.filter((r) => r.status === "AVAILABLE").length;
    const low = inv.filter((r) => r.status === "LOW_STOCK").length;
    const out = inv.filter((r) => r.status === "OUT_OF_STOCK").length;
    const ph = getPharmacyById(pharmacyId);
    return { pharmacy: ph, total: inv.length, available, low, out, rows: inv };
  }

  /** Synthetic but internally-consistent data-quality figures (section 19). */
  function dataQualityStats() {
    const processed = RAW.inventory.length + 1240 + 823; // + last two demo import batches
    const duplicates = Math.round(processed * 0.017);
    const missing = Math.round(processed * 0.014);
    const unmatched = Math.round(processed * 0.011);
    const invalid = Math.round(processed * 0.006);
    const valid = processed - duplicates - missing - unmatched - invalid;
    return { processed, valid, duplicates, missing, unmatched, invalid };
  }

  global.PTStore = {
    RAW,
    getPharmacyById,
    getMedicineById,
    allPharmacies,
    allMedicines,
    inventoryForMedicine,
    inventoryForPharmacy,
    historyForMedicine,
    historyForPair,
    searchesForMedicine,
    searchMedicines,
    medicineAvailabilitySummary,
    pharmaciesForMedicine,
    shortageRisk,
    topShortageRisks,
    topSearchedMedicines,
    mostOutOfStockMedicines,
    availabilityByCity,
    availabilityByCategory,
    pharmacyFreshnessBuckets,
    inventoryTrendSeries,
    shortageTrendSeries,
    systemStats,
    pharmacyStats,
    dataQualityStats,
    commitImport,
    getImportLog,
  };
})(window);
