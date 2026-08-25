/**
 * matching.js — demo medicine matcher.
 *
 * Uses simple normalization + Jaccard token similarity (see utils.js) to
 * decide whether a raw name from a legacy export ("PANADOL 500MG",
 * "Panadol 500 mg Tablet") corresponds to a catalog medicine.
 *
 */
(function (global) {
  "use strict";
  const U = global.PTUtils;
  const Store = global.PTStore;

  const MATCH_THRESHOLD = 0.34;

  /**
   * @param {string} rawName - free-text medicine name+strength from a CSV row
   * @returns {{medicine: object|null, confidence: number}}
   */
  function matchMedicine(rawName) {
    // ---- REPLACEABLE MATCHING STRATEGY ----
    // Today: normalize + Jaccard token overlap against the catalog.
    // Future: call a Python service running RapidFuzz.process.extractOne()
    // or a TF-IDF / embedding nearest-neighbor search for higher recall
    // on abbreviations, typos, and transliteration variants.
    let best = null;
    let bestScore = 0;
    Store.allMedicines().forEach((m) => {
      const candidate = `${m.brand_name} ${m.strength} ${m.dosage_form}`;
      const score = U.similarity(rawName, candidate) * 0.7 + U.similarity(rawName, m.brand_name) * 0.3;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    });
    if (bestScore < MATCH_THRESHOLD) return { medicine: null, confidence: bestScore };
    return { medicine: best, confidence: bestScore };
  }

  global.PTMatching = { matchMedicine, MATCH_THRESHOLD };
})(window);
