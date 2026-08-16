(function () {
  const { api, storage, geolocation, theme, weather, ui } = window.SkyCast;

  const DEFAULT_CITY = { name: "Tripoli", country: "Libya", admin1: "", lat: 32.8872, lon: 13.1913 };

  const state = {
    unit: storage.getPreferredUnit(),
    city: null,
    lastWeather: null,
  };

  // ---------------------------------------------------------------- init --
  async function init() {
    bindEvents();
    ui.renderRecents(storage.getRecentCities(), selectCity);

    const last = storage.getLastLocation();
    await loadCity(last || DEFAULT_CITY, { silent: true });
  }

  // ------------------------------------------------------------ loading --
  async function loadCity(city, { silent = false } = {}) {
    state.city = city;
    ui.hideStatus();
    ui.setLoading(true);
    try {
      const { data, fromCache } = await api.fetchWeather(city.lat, city.lon);
      state.lastWeather = data;
      renderAll(city, data);
      storage.setLastLocation(city);
      if (fromCache) {
        ui.showStatus("Showing last saved forecast — you appear to be offline.", "error");
      } else if (!silent) {
        ui.hideStatus();
      }
    } catch (err) {
      ui.setLoading(false);
      ui.showStatus(err.message || "Couldn't load weather right now.", "error");
    }
  }

  // ------------------------------------------------------------ render ---
  function renderAll(city, data) {
    const current = data.current;
    const desc = weather.describeWeather(current.weather_code, current.is_day === 1);
    theme.applyTheme(desc.theme);

    const todayIdx = 0;
    ui.renderHero({
      locationLabel: city.name,
      locationSub: [city.admin1, city.country].filter(Boolean).join(", "),
      current: {
        temp: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        theme: desc.theme,
        label: desc.label,
        hi: data.daily.temperature_2m_max[todayIdx],
        lo: data.daily.temperature_2m_min[todayIdx],
      },
      unit: state.unit,
    });

    ui.renderHourly(buildHourly(data), state.unit);

    const weekMax = Math.max(...data.daily.temperature_2m_max);
    const weekMin = Math.min(...data.daily.temperature_2m_min);
    ui.renderDaily(buildDaily(data), state.unit, weekMax, weekMin);

    ui.renderDetails(
      {
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        pressure: current.pressure_msl,
        visibility: current.visibility,
        uv: data.daily.uv_index_max[todayIdx] ?? 0,
        sunrise: formatClock(data.daily.sunrise[todayIdx]),
        sunset: formatClock(data.daily.sunset[todayIdx]),
      },
      state.unit,
      state.unit === "F" ? "mph" : "km/h"
    );
  }

  function buildHourly(data) {
    const now = new Date();
    const times = data.hourly.time;
    let startIndex = times.findIndex((t) => new Date(t) >= now);
    if (startIndex === -1) startIndex = 0;

    return times.slice(startIndex, startIndex + 24).map((t, i) => {
      const idx = startIndex + i;
      const code = data.hourly.weather_code[idx];
      const isDay = data.hourly.is_day[idx] === 1;
      const desc = weather.describeWeather(code, isDay);
      return {
        label: i === 0 ? "Now" : formatHour(t),
        temp: data.hourly.temperature_2m[idx],
        theme: desc.theme,
      };
    });
  }

  function buildDaily(data) {
    return data.daily.time.map((t, idx) => {
      const desc = weather.describeWeather(data.daily.weather_code[idx], true);
      return {
        day: idx === 0 ? "Today" : formatDay(t),
        hi: data.daily.temperature_2m_max[idx],
        lo: data.daily.temperature_2m_min[idx],
        theme: desc.theme,
      };
    });
  }

  function formatHour(iso) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric" });
  }
  function formatDay(iso) {
    return new Date(iso).toLocaleDateString(undefined, { weekday: "short" });
  }
  function formatClock(iso) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  // ------------------------------------------------------------ actions --
  function selectCity(city) {
    ui.closeSearchPanel();
    ui.el.searchInput.value = "";
    storage.addRecentCity(city);
    ui.renderRecents(storage.getRecentCities(), selectCity);
    loadCity(city);
  }

  async function useMyLocation() {
    ui.showStatus("Finding your location…");
    try {
      const { lat, lon } = await geolocation.getCurrentPosition();
      const city = { name: "Current Location", country: "", admin1: "", lat, lon };
      ui.hideStatus();
      loadCity(city);
    } catch (err) {
      ui.showStatus(err.message, "error");
    }
  }

  function setUnit(unit) {
    state.unit = unit;
    storage.setPreferredUnit(unit);
    document.querySelectorAll("[data-unit-option]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.unitOption === unit));
    });
    if (state.city && state.lastWeather) {
      renderAll(state.city, state.lastWeather);
    }
  }

  function toggleNotifications(pressed) {
    storage.setNotifications(pressed);
    const btn = document.getElementById("notifToggle");
    btn.setAttribute("aria-pressed", String(pressed));
    if (pressed && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  // ------------------------------------------------------------ events ---
  let searchDebounce = null;
  function bindEvents() {
    const { el } = ui;

    el.searchInput?.addEventListener("input", (e) => {
      const value = e.target.value;
      clearTimeout(searchDebounce);
      if (!value.trim()) {
        ui.renderSearchResults([], selectCity);
        ui.closeSearchPanel();
        return;
      }
      searchDebounce = setTimeout(async () => {
        try {
          const results = await api.searchCities(value);
          ui.renderSearchResults(results, selectCity);
        } catch {
          ui.showStatus("City search failed. Check your connection.", "error");
        }
      }, 350);
    });

    el.searchInput?.addEventListener("focus", () => {
      if (el.searchInput.value.trim()) ui.openSearchPanel();
    });

    document.addEventListener("click", (e) => {
      if (!el.searchPanel.contains(e.target) && e.target !== el.searchInput) {
        ui.closeSearchPanel();
      }
    });

    document.getElementById("locateBtn")?.addEventListener("click", useMyLocation);

    document.getElementById("settingsBtn")?.addEventListener("click", () => {
      document.getElementById("settingsPanel").classList.add("is-open");
    });
    document.getElementById("closeSettingsBtn")?.addEventListener("click", () => {
      document.getElementById("settingsPanel").classList.remove("is-open");
    });
    document.getElementById("settingsPanel")?.addEventListener("click", (e) => {
      if (e.target.id === "settingsPanel") e.currentTarget.classList.remove("is-open");
    });

    document.querySelectorAll("[data-unit-option]").forEach((btn) => {
      btn.addEventListener("click", () => setUnit(btn.dataset.unitOption));
      btn.setAttribute("aria-pressed", String(btn.dataset.unitOption === state.unit));
    });

    const notifToggle = document.getElementById("notifToggle");
    notifToggle?.addEventListener("click", () => {
      const pressed = notifToggle.getAttribute("aria-pressed") === "true";
      toggleNotifications(!pressed);
    });
    if (notifToggle) notifToggle.setAttribute("aria-pressed", String(storage.getNotifications()));

    document.getElementById("clearRecentsBtn")?.addEventListener("click", () => {
      storage.clearRecentCities();
      ui.renderRecents([], selectCity);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        ui.closeSearchPanel();
        document.getElementById("settingsPanel")?.classList.remove("is-open");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
