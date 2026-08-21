// Populates the report with real, pre-calculated analysis results
// from data.js (generated from outputs/cleaned_data/analysis_results.json).

(function () {
  const stats = analysisData.basic_statistics;
  const bySex = analysisData.survival_by_sex;
  const byClass = analysisData.survival_by_class;
  const byAlone = analysisData.survival_by_alone_status;

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText("stat-total", stats.total_passengers.toLocaleString());
  setText("stat-survivors", stats.survivors.toLocaleString());
  setText("stat-nonsurvivors", stats.non_survivors.toLocaleString());
  setText("stat-rate", stats.survival_rate_percent.toFixed(1) + "%");
  setText("stat-age", stats.average_age.toFixed(1) + " yrs");
  setText("stat-fare", "$" + stats.average_fare.toFixed(2));

  const findings = [
    `Overall survival rate was <strong>${stats.survival_rate_percent.toFixed(1)}%</strong> — ${stats.survivors} of ${stats.total_passengers} passengers survived.`,
    `Survival differed sharply by sex: <strong>${bySex.female.toFixed(1)}%</strong> of female passengers survived, versus <strong>${bySex.male.toFixed(1)}%</strong> of male passengers.`,
    `Passenger class was related to survival: 1st class <strong>${byClass["1"].toFixed(1)}%</strong>, 2nd class <strong>${byClass["2"].toFixed(1)}%</strong>, 3rd class <strong>${byClass["3"].toFixed(1)}%</strong>.`,
    `Passengers travelling alone survived at <strong>${byAlone["Alone"].toFixed(1)}%</strong>, compared with <strong>${byAlone["With Family"].toFixed(1)}%</strong> for those travelling with family.`,
    `Average age was <strong>${stats.average_age.toFixed(1)} years</strong> and average fare was <strong>$${stats.average_fare.toFixed(2)}</strong>, with fares ranging from $${stats.min_fare.toFixed(2)} to $${stats.max_fare.toFixed(2)}.`,
  ];

  const list = document.getElementById("findings-list");
  if (list) {
    list.innerHTML = findings.map((f) => `<li>${f}</li>`).join("");
  }
})();
