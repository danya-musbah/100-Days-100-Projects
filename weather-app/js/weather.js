/* ==========================================================================
  SkyCast — weather.js
  Pure functions: turn a raw WMO weather code + is_day flag into something
  the rest of the app can use — a theme key, a human description, an icon.
  No DOM, no fetch, no storage.
  ========================================================================== */

(function () {

/**
 * WMO Weather interpretation codes (used by Open-Meteo) grouped into the
 * six SkyCast theme categories.
 */
const CODE_MAP = {
  0: { label: "Clear sky", category: "sunny" },
  1: { label: "Mostly clear", category: "sunny" },
  2: { label: "Partly cloudy", category: "cloudy" },
  3: { label: "Overcast", category: "cloudy" },
  45: { label: "Fog", category: "cloudy" },
  48: { label: "Depositing rime fog", category: "cloudy" },
  51: { label: "Light drizzle", category: "rain" },
  53: { label: "Drizzle", category: "rain" },
  55: { label: "Dense drizzle", category: "rain" },
  56: { label: "Freezing drizzle", category: "rain" },
  57: { label: "Dense freezing drizzle", category: "rain" },
  61: { label: "Slight rain", category: "rain" },
  63: { label: "Rain", category: "rain" },
  65: { label: "Heavy rain", category: "rain" },
  66: { label: "Freezing rain", category: "rain" },
  67: { label: "Heavy freezing rain", category: "rain" },
  71: { label: "Slight snow", category: "snow" },
  73: { label: "Snow", category: "snow" },
  75: { label: "Heavy snow", category: "snow" },
  77: { label: "Snow grains", category: "snow" },
  80: { label: "Slight rain showers", category: "rain" },
  81: { label: "Rain showers", category: "rain" },
  82: { label: "Violent rain showers", category: "rain" },
  85: { label: "Slight snow showers", category: "snow" },
  86: { label: "Heavy snow showers", category: "snow" },
  95: { label: "Thunderstorm", category: "storm" },
  96: { label: "Thunderstorm, slight hail", category: "storm" },
  99: { label: "Thunderstorm, heavy hail", category: "storm" },
};

/**
 * Resolve a weather code + daylight flag into a full description object.
 * @param {number} code - WMO weather code
 * @param {boolean} isDay - true if it's currently daytime at the location
 * @returns {{label: string, category: string, theme: string}}
 */
function describeWeather(code, isDay = true) {
  const entry = CODE_MAP[code] || { label: "Unknown", category: "cloudy" };
  // Storms, rain and snow keep their own dramatic/cool identity at night too;
  // only the "calm sky" categories (sunny/cloudy) flip to the Night palette.
  const theme = !isDay && (entry.category === "sunny" || entry.category === "cloudy")
    ? "night"
    : entry.category;
  return { label: entry.label, category: entry.category, theme };
}

/**
 * Inline SVG icon set — one per theme category, plus a night variant.
 * Kept as plain strokes so they inherit currentColor and stay crisp at
 * any size without extra image requests.
 */
const ICONS = {
  sunny: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4.6"/><path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/></svg>`,
  cloudy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 18.5h11a3.8 3.8 0 0 0 .6-7.55 5.2 5.2 0 0 0-9.94-1.6A4.3 4.3 0 0 0 6.5 18.5Z"/></svg>`,
  rain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 14.5h11a3.8 3.8 0 0 0 .6-7.55 5.2 5.2 0 0 0-9.94-1.6A4.3 4.3 0 0 0 6.5 14.5Z"/><path d="M8.5 18.5l-1 2.2M12 18.5l-1 2.2M15.5 18.5l-1 2.2"/></svg>`,
  storm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 13.5h10a3.6 3.6 0 0 0 .5-7.16A5 5 0 0 0 7.4 5.1 4.1 4.1 0 0 0 6.5 13.5Z"/><path d="M13 13.5l-2.6 4.2h3L11 22"/></svg>`,
  snow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 13.5h11a3.8 3.8 0 0 0 .6-7.55 5.2 5.2 0 0 0-9.94-1.6A4.3 4.3 0 0 0 6.5 13.5Z"/><path d="M9 18v3M12 18v3M15 18v3M8 19.5l2-1M12 19.5l0 0M16 18.5l-2 1M8 20.5l2 1M16 20.5l-2-1"/></svg>`,
  night: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2Z"/></svg>`,
};

/**
 * @param {string} theme - one of sunny|cloudy|rain|storm|snow|night
 * @returns {string} inline SVG markup
 */
function getWeatherIcon(theme) {
  return ICONS[theme] || ICONS.cloudy;
}

/** Convert a temperature in Celsius to Fahrenheit, rounded. */
function toFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

/** Format a temperature for display given the preferred unit ("C" | "F"). */
function formatTemp(celsius, unit) {
  const value = unit === "F" ? toFahrenheit(celsius) : Math.round(celsius);
  return `${value}°`;
}

/** Convert km/h to mph. */
function toMph(kmh) {
  return Math.round(kmh * 0.621371);
}

/** UV index bucket → human hint, matches Apple-style guidance copy. */
function uvHint(uv) {
  if (uv >= 8) return "Very high — seek shade";
  if (uv >= 6) return "High — use sunscreen";
  if (uv >= 3) return "Moderate";
  return "Low";
}

/** Visibility in meters → a short readable hint. */
function visibilityHint(meters) {
  const km = meters / 1000;
  if (km >= 10) return "Clear view ahead";
  if (km >= 4) return "Slightly hazy";
  return "Reduced visibility";
}

// Expose only through the `window.SkyCast` namespace to avoid global leaks.
window.SkyCast = window.SkyCast || {};
window.SkyCast.weather = {
  describeWeather,
  getWeatherIcon,
  formatTemp,
  toFahrenheit,
  toMph,
  uvHint,
  visibilityHint,
};

})();
