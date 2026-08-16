const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const CACHE_KEY = "skycast:cache:v1";
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

function getApiKey() {
  return window.SKYCAST_API_KEY || "";
}

/**
 * @param {string} query - city name search text
 * @returns {Promise<Array<{name:string,country:string,admin1:string,lat:number,lon:number}>>}
 */
async function searchCities(query) {
  if (!query || query.trim().length < 2) return [];
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("City search failed. Try again.");
  const data = await response.json();

  return (data.results || []).map((r) => ({
    name: r.name,
    country: r.country || r.country_code || "",
    admin1: r.admin1 || "",
    lat: r.latitude,
    lon: r.longitude,
  }));
}

/**
 * Fetch current conditions, 24h hourly, and 7-day daily forecast for a point.
 * Falls back to the last successful cached response (per lat/lon) if the
 * network is unavailable, so the app stays usable offline.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{data: object, fromCache: boolean}>}
 */
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    timezone: "auto",
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "weather_code",
      "wind_speed_10m",
      "pressure_msl",
      "is_day",
      "visibility",
      "uv_index",
    ].join(","),
    hourly: ["temperature_2m", "weather_code", "is_day"].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "uv_index_max",
    ].join(","),
    forecast_days: "7",
    wind_speed_unit: "kmh",
  });

  const cacheId = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  try {
    const response = await fetch(`${FORECAST_URL}?${params.toString()}`);
    if (!response.ok) throw new Error("Weather service returned an error.");
    const data = await response.json();
    cacheResponse(cacheId, data);
    return { data, fromCache: false };
  } catch (err) {
    const cached = readCache(cacheId);
    if (cached) {
      return { data: cached, fromCache: true };
    }
    throw err instanceof Error ? err : new Error("Couldn't load weather data.");
  }
}

function cacheResponse(id, data) {
  try {
    const store = readAllCache();
    store[id] = { data, savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    // Storage may be full or unavailable (private browsing) — safe to ignore.
  }
}

function readCache(id) {
  const store = readAllCache();
  const entry = store[id];
  if (!entry) return null;
  if (Date.now() - entry.savedAt > CACHE_MAX_AGE_MS * 8) return null; // 4h hard ceiling for offline use
  return entry.data;
}

function readAllCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

window.SkyCast = window.SkyCast || {};
window.SkyCast.api = { searchCities, fetchWeather };
