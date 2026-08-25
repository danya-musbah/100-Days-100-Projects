/**
 * import.js — the CSV import pipeline that powers import.html.
 *
 * Raw CSV → Validation → Cleaning → Normalization → Medicine Matching →
 * Duplicate Detection → Standardized Data
 *
 */
(function (global) {
  "use strict";
  const U = global.PTUtils;
  const Matching = global.PTMatching;

  // ---- 1. Raw CSV parsing (handles quoted fields + commas inside quotes) ----
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  }

  // ---- 2. Column detection: map varied legacy headers to a canonical schema ----
  const COLUMN_ALIASES = {
    name: ["medicine name", "product", "drug_name", "drug name", "item", "medicine"],
    quantity: ["qty", "quantity", "stock", "stock_qty", "units"],
    date: ["last updated", "date", "updated_at", "updated", "last_sync", "sync_date"],
  };

  function detectColumns(headerRow) {
    const normalizedHeaders = headerRow.map((h) => h.trim().toLowerCase().replace(/_/g, " "));
    const mapping = {};
    Object.entries(COLUMN_ALIASES).forEach(([canonical, aliases]) => {
      const idx = normalizedHeaders.findIndex((h) => aliases.includes(h));
      mapping[canonical] = idx;
    });
    return mapping;
  }

  // ---- 3–4. Cleaning + validation of a single raw row ----
  function cleanRow(rawRow, mapping, rowIndex) {
    const get = (key) => (mapping[key] >= 0 ? (rawRow[mapping[key]] || "").toString() : "");
    const problems = [];

    let name = get("name").replace(/\s+/g, " ").trim();
    if (!name) problems.push("missing_name");

    let qtyStr = get("quantity").trim();
    let quantity = null;
    if (qtyStr === "" ) {
      problems.push("missing_quantity");
    } else {
      const parsed = Number(qtyStr);
      if (isNaN(parsed)) {
        problems.push("invalid_quantity");
      } else if (parsed < 0) {
        problems.push("invalid_quantity");
      } else {
        quantity = Math.round(parsed);
      }
    }

    let dateStr = get("date").trim();
    let isoDate = null;
    if (!dateStr) {
      problems.push("missing_date");
    } else {
      isoDate = normalizeDate(dateStr);
      if (!isoDate) problems.push("invalid_date");
    }

    return {
      rowIndex,
      rawName: name,
      normalizedName: U.normalizeMedicineString(name),
      quantity,
      dateStr,
      isoDate,
      problems,
    };
  }

  function normalizeDate(str) {
    // Accept YYYY-MM-DD, DD/MM/YYYY, or ISO with time.
    str = str.trim();
    let m;
    if ((m = str.match(/^(\d{4})-(\d{2})-(\d{2})T?(\d{2}:\d{2}:\d{2})?/))) {
      const time = m[4] || "00:00:00";
      return `${m[1]}-${m[2]}-${m[3]} ${time}`;
    }
    if ((m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
      const dd = m[1].padStart(2, "0");
      const mm = m[2].padStart(2, "0");
      return `${m[3]}-${mm}-${dd} 00:00:00`;
    }
    return null;
  }

  function statusForQuantity(q) {
    if (q <= 0) return "OUT_OF_STOCK";
    if (q < 20) return "LOW_STOCK";
    return "AVAILABLE";
  }

  /**
   * Full pipeline entry point.
   * @returns {{ preview: object[], valid: object[], duplicates: number,
   *             invalidQuantities: number, missingFields: number,
   *             unmatched: number, totalRows: number }}
   */
  function runPipeline(csvText) {
    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      return { preview: [], valid: [], duplicates: 0, invalidQuantities: 0, missingFields: 0, unmatched: 0, totalRows: 0, columnMapping: {} };
    }
    const header = rows[0];
    const mapping = detectColumns(header);
    const dataRows = rows.slice(1);

    const cleaned = dataRows.map((r, i) => cleanRow(r, mapping, i));

    // 5. Medicine matching
    cleaned.forEach((r) => {
      if (!r.rawName) {
        r.match = { medicine: null, confidence: 0 };
        return;
      }
      r.match = Matching.matchMedicine(r.rawName);
    });

    // 6. Duplicate detection — same matched medicine (or same normalized name) seen twice
    const seen = new Set();
    cleaned.forEach((r) => {
      const key = r.match.medicine ? r.match.medicine.medicine_id : r.normalizedName;
      if (!key) return;
      if (seen.has(key)) {
        r.problems.push("duplicate");
      } else {
        seen.add(key);
      }
    });

    let missingFields = 0,
      invalidQuantities = 0,
      duplicates = 0,
      unmatched = 0;

    cleaned.forEach((r) => {
      if (r.problems.includes("missing_name") || r.problems.includes("missing_quantity") || r.problems.includes("missing_date")) missingFields++;
      if (r.problems.includes("invalid_quantity") || r.problems.includes("invalid_date")) invalidQuantities++;
      if (r.problems.includes("duplicate")) duplicates++;
      if (r.rawName && !r.match.medicine) unmatched++;
    });

    const valid = cleaned
      .filter((r) => r.problems.length === 0 && r.match.medicine)
      .map((r) => ({
        medicine_id: r.match.medicine.medicine_id,
        medicine_name: `${r.match.medicine.brand_name} ${r.match.medicine.strength}`,
        quantity: r.quantity,
        status: statusForQuantity(r.quantity),
        updated_at: r.isoDate,
        confidence: r.match.confidence,
      }));

    return {
      preview: cleaned,
      valid,
      duplicates,
      invalidQuantities,
      missingFields,
      unmatched,
      totalRows: cleaned.length,
      columnMapping: mapping,
      headerRow: header,
    };
  }

  global.PTImport = { parseCSV, detectColumns, cleanRow, normalizeDate, runPipeline, statusForQuantity };
})(window);
