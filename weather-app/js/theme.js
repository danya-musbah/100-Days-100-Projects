/* ==========================================================================
   SkyCast — theme.js
   Applies the weather-driven palette to <html data-weather="..."> and
   (re)builds the lightweight animated background scene to match.
   ========================================================================== */

let currentTheme = null;

/**
 * @param {string} theme - sunny|cloudy|rain|storm|snow|night
 */
function applyTheme(theme) {
  if (theme === currentTheme) return;
  currentTheme = theme;
  document.documentElement.setAttribute("data-weather", theme);
  buildScene(theme);
}

function getCurrentTheme() {
  return currentTheme;
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function buildScene(theme) {
  const scene = document.getElementById("weatherScene");
  if (!scene) return;
  scene.innerHTML = "";

  const glow = document.createElement("div");
  glow.className = "weather-scene__glow";
  scene.appendChild(glow);

  if (reduceMotion) return; // Static glow only — respects user preference.

  if (theme === "cloudy" || theme === "rain" || theme === "storm") {
    scene.appendChild(buildClouds());
  }
  if (theme === "rain" || theme === "storm") {
    scene.appendChild(buildRain(theme === "storm" ? 46 : 30));
  }
  if (theme === "storm") {
    const flash = document.createElement("div");
    flash.className = "flash";
    scene.appendChild(flash);
  }
  if (theme === "snow") {
    scene.appendChild(buildSnow(38));
  }
  if (theme === "night") {
    scene.appendChild(buildStars(60));
  }
}

function buildClouds() {
  const wrap = document.createElement("div");
  const shapes = 3;
  for (let i = 0; i < shapes; i++) {
    const cloud = document.createElement("div");
    cloud.className = "cloud";
    cloud.innerHTML = window.SkyCast.weather.getWeatherIcon("cloudy");
    const size = 70 + Math.random() * 60;
    cloud.style.width = `${size}px`;
    cloud.style.height = `${size}px`;
    cloud.style.top = `${8 + i * 14 + Math.random() * 10}%`;
    cloud.style.left = "-15vw";
    cloud.style.animationDuration = `${38 + i * 12}s`;
    cloud.style.animationDelay = `${i * -9}s`;
    wrap.appendChild(cloud);
  }
  return wrap.children.length ? wrapFragment(wrap) : wrap;
}

function wrapFragment(wrap) {
  const frag = document.createDocumentFragment();
  while (wrap.firstChild) frag.appendChild(wrap.firstChild);
  const holder = document.createElement("div");
  holder.appendChild(frag);
  return holder;
}

function buildRain(count) {
  const layer = document.createElement("div");
  layer.className = "rain-layer";
  for (let i = 0; i < count; i++) {
    const drop = document.createElement("span");
    drop.className = "drop";
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
    drop.style.animationDelay = `${Math.random() * 2}s`;
    drop.style.opacity = String(0.4 + Math.random() * 0.5);
    layer.appendChild(drop);
  }
  return layer;
}

function buildSnow(count) {
  const layer = document.createElement("div");
  layer.className = "snow-layer";
  for (let i = 0; i < count; i++) {
    const flake = document.createElement("span");
    flake.className = "flake";
    const size = 3 + Math.random() * 5;
    flake.style.width = `${size}px`;
    flake.style.height = `${size}px`;
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.animationDuration = `${8 + Math.random() * 8}s`;
    flake.style.animationDelay = `${Math.random() * 6}s`;
    flake.style.opacity = String(0.5 + Math.random() * 0.5);
    layer.appendChild(flake);
  }
  return layer;
}

function buildStars(count) {
  const layer = document.createElement("div");
  for (let i = 0; i < count; i++) {
    const star = document.createElement("span");
    star.className = "star";
    const size = 1 + Math.random() * 2;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.top = `${Math.random() * 60}%`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.animationDuration = `${2 + Math.random() * 3}s`;
    star.style.animationDelay = `${Math.random() * 3}s`;
    layer.appendChild(star);
  }
  return layer;
}

window.SkyCast = window.SkyCast || {};
window.SkyCast.theme = { applyTheme, getCurrentTheme };
