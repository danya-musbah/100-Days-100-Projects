/* ==========================================================================
   SkyCast — ui.js
   Rendering only. Every function here takes plain data in and writes DOM
   out; no fetches, no localStorage, no geolocation.
   ========================================================================== */

const { formatTemp, getWeatherIcon, uvHint, visibilityHint, toMph } = window.SkyCast.weather;

const el = {
  hero: document.getElementById("hero"),
  heroLocation: document.getElementById("heroLocation"),
  heroLocationSub: document.getElementById("heroLocationSub"),
  heroIcon: document.getElementById("heroIcon"),
  heroTemp: document.getElementById("heroTemp"),
  heroCondition: document.getElementById("heroCondition"),
  heroFeels: document.getElementById("heroFeels"),
  heroHi: document.getElementById("heroHi"),
  heroLo: document.getElementById("heroLo"),
  hourly: document.getElementById("hourlyList"),
  daily: document.getElementById("dailyList"),
  details: document.getElementById("detailsGrid"),
  status: document.getElementById("statusBanner"),
  searchPanel: document.getElementById("searchPanel"),
  searchResults: document.getElementById("searchResults"),
  recentList: document.getElementById("recentList"),
  recentSection: document.getElementById("recentSection"),
};

function showStatus(message, tone = "info") {
  if (!el.status) return;
  el.status.textContent = message;
  el.status.dataset.tone = tone;
  el.status.classList.add("is-visible");
}

function hideStatus() {
  el.status?.classList.remove("is-visible");
}

function setLoading(isLoading) {
  [el.heroTemp, el.heroCondition, el.heroLocation].forEach((node) => {
    if (!node) return;
    node.classList.toggle("skeleton", isLoading);
  });
}

/**
 * @param {object} params
 * @param {string} params.locationLabel
 * @param {string} params.locationSub
 * @param {object} params.current - { temp, feelsLike, theme, label, hi, lo }
 * @param {string} params.unit
 */
function renderHero({ locationLabel, locationSub, current, unit }) {
  setLoading(false);
  el.heroLocation.textContent = locationLabel;
  el.heroLocationSub.textContent = locationSub;
  el.heroIcon.innerHTML = getWeatherIcon(current.theme);
  el.heroTemp.textContent = formatTemp(current.temp, unit);
  el.heroCondition.textContent = current.label;
  el.heroFeels.textContent = `Feels like ${formatTemp(current.feelsLike, unit)}`;
  el.heroHi.textContent = `H:${formatTemp(current.hi, unit)}`;
  el.heroLo.textContent = `L:${formatTemp(current.lo, unit)}`;
}

/**
 * @param {Array<{label:string, temp:number, theme:string}>} hours
 * @param {string} unit
 */
function renderHourly(hours, unit) {
  el.hourly.innerHTML = "";
  const frag = document.createDocumentFragment();
  hours.forEach((h) => {
    const item = document.createElement("li");
    item.className = "hour";
    item.innerHTML = `
      <span class="hour__label">${h.label}</span>
      <span class="hour__icon">${getWeatherIcon(h.theme)}</span>
      <span class="hour__temp">${formatTemp(h.temp, unit)}</span>
    `;
    frag.appendChild(item);
  });
  el.hourly.appendChild(frag);
}

/**
 * @param {Array<{day:string, hi:number, lo:number, theme:string}>} days
 * @param {string} unit
 * @param {number} weekMax
 * @param {number} weekMin
 */
function renderDaily(days, unit, weekMax, weekMin) {
  el.daily.innerHTML = "";
  const frag = document.createDocumentFragment();
  const span = Math.max(1, weekMax - weekMin);

  days.forEach((d) => {
    const row = document.createElement("li");
    row.className = "day";
    const startPct = ((d.lo - weekMin) / span) * 100;
    const widthPct = ((d.hi - d.lo) / span) * 100;
    row.innerHTML = `
      <span class="day__name">${d.day}</span>
      <span class="day__icon">${getWeatherIcon(d.theme)}</span>
      <span class="day__bar-track" style="position:relative;height:4px;">
        <span class="day__bar" style="position:absolute;left:${startPct}%;width:${Math.max(widthPct, 8)}%;top:0;"></span>
      </span>
      <span class="day__range"><span class="day__min">${formatTemp(d.lo, unit)}</span><span class="day__max">${formatTemp(d.hi, unit)}</span></span>
    `;
    frag.appendChild(row);
  });
  el.daily.appendChild(frag);
}

const DETAIL_ICONS = {
  humidity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3s6 6.6 6 10.8a6 6 0 1 1-12 0C6 9.6 12 3 12 3Z"/></svg>`,
  wind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 8h11a2.6 2.6 0 1 0-2.4-3.6M3 16h14a2.6 2.6 0 1 1-2.4 3.6M3 12h8"/></svg>`,
  pressure: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4l3 2" stroke-linecap="round"/></svg>`,
  visibility: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>`,
  uv: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="14" r="4.5"/><path d="M12 3v2.2M4.5 9.5l1.6 1.2M19.5 9.5l-1.6 1.2M2.5 15h2.4M19.1 15h2.4"/></svg>`,
  sunrise: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 18h16M6.5 15A5.5 5.5 0 0 1 12 9.5 5.5 5.5 0 0 1 17.5 15M12 5.5V3M5 8l1.6 1.6M19 8l-1.6 1.6"/></svg>`,
  sunset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 18h16M6.5 15A5.5 5.5 0 0 1 12 9.5 5.5 5.5 0 0 1 17.5 15M12 4.5V7M5 8l1.6 1.6M19 8l-1.6 1.6"/></svg>`,
};

/**
 * @param {object} d - flattened current-conditions detail data
 * @param {string} unit
 * @param {string} windUnit - "km/h" | "mph"
 */
function renderDetails(d, unit, windUnit) {
  const wind = windUnit === "mph" ? `${toMph(d.windSpeed)} mph` : `${Math.round(d.windSpeed)} km/h`;
  const cards = [
    { key: "humidity", label: "Humidity", value: `${Math.round(d.humidity)}%`, hint: d.humidity > 70 ? "Feels muggy" : "Comfortable" },
    { key: "wind", label: "Wind", value: wind, hint: "Sustained speed" },
    { key: "pressure", label: "Pressure", value: `${Math.round(d.pressure)} hPa`, hint: d.pressure < 1009 ? "Low pressure system" : "Stable" },
    { key: "visibility", label: "Visibility", value: `${(d.visibility / 1000).toFixed(1)} km`, hint: visibilityHint(d.visibility) },
    { key: "uv", label: "UV Index", value: `${Math.round(d.uv)}`, hint: uvHint(d.uv) },
    { key: "sunrise", label: "Sunrise", value: d.sunrise, hint: "" },
    { key: "sunset", label: "Sunset", value: d.sunset, hint: "" },
  ];

  el.details.innerHTML = "";
  const frag = document.createDocumentFragment();
  cards.forEach((c) => {
    const card = document.createElement("div");
    card.className = "detail-card";
    card.innerHTML = `
      <span class="detail-card__label">${DETAIL_ICONS[c.key] || ""} ${c.label}</span>
      <span class="detail-card__value">${c.value}</span>
      ${c.hint ? `<span class="detail-card__hint">${c.hint}</span>` : ""}
    `;
    frag.appendChild(card);
  });
  el.details.appendChild(frag);
}

/**
 * @param {Array<{name:string,country:string,admin1:string,lat:number,lon:number}>} results
 * @param {(city:object)=>void} onPick
 */
function renderSearchResults(results, onPick) {
  el.searchResults.innerHTML = "";
  if (!results.length) {
    el.searchResults.innerHTML = `<p style="padding:0.6rem;opacity:.6;font-size:.85rem;">No cities found.</p>`;
    openSearchPanel();
    return;
  }
  const frag = document.createDocumentFragment();
  results.forEach((city) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search__result";
    const region = [city.admin1, city.country].filter(Boolean).join(", ");
    btn.innerHTML = `<span>${city.name}</span><span>${region}</span>`;
    btn.addEventListener("click", () => onPick(city));
    frag.appendChild(btn);
  });
  el.searchResults.appendChild(frag);
  openSearchPanel();
}

function renderRecents(cities, onPick) {
  if (!el.recentList) return;
  el.recentList.innerHTML = "";
  if (!cities.length) {
    el.recentSection.style.display = "none";
    return;
  }
  el.recentSection.style.display = "";
  const frag = document.createDocumentFragment();
  cities.forEach((city) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "recent-chip";
    const region = [city.admin1, city.country].filter(Boolean).join(", ");
    btn.innerHTML = `<span>${city.name}</span><span>${region}</span>`;
    btn.addEventListener("click", () => onPick(city));
    frag.appendChild(btn);
  });
  el.recentList.appendChild(frag);
}

function openSearchPanel() {
  el.searchPanel.classList.add("is-open");
}
function closeSearchPanel() {
  el.searchPanel.classList.remove("is-open");
}

window.SkyCast = window.SkyCast || {};
window.SkyCast.ui = {
  el,
  showStatus,
  hideStatus,
  setLoading,
  renderHero,
  renderHourly,
  renderDaily,
  renderDetails,
  renderSearchResults,
  renderRecents,
  openSearchPanel,
  closeSearchPanel,
};
