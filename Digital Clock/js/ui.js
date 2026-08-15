// ui.js — DOM references, rendering, and event listener wiring.

export const dom = {
  app: document.getElementById("app"),
  clock: document.getElementById("clock"),
  timeMain: document.getElementById("timeMain"),
  timeSeconds: document.getElementById("timeSeconds"),
  dayLabel: document.getElementById("dayLabel"),
  dateLabel: document.getElementById("dateLabel"),
  zoneLabel: document.getElementById("zoneLabel"),
  greeting: document.getElementById("greeting"),
  srStatus: document.getElementById("srStatus"),

  btn24: document.getElementById("btn24"),
  btn12: document.getElementById("btn12"),
  settingsBtn24: document.getElementById("settingsBtn24"),
  settingsBtn12: document.getElementById("settingsBtn12"),

  fullscreenBtn: document.getElementById("fullscreenBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  scrim: document.getElementById("scrim"),

  toggleSeconds: document.getElementById("toggleSeconds"),
  toggleDate: document.getElementById("toggleDate"),
  toggleTimezone: document.getElementById("toggleTimezone"),
  toggleGreeting: document.getElementById("toggleGreeting"),
  toggleWakeLock: document.getElementById("toggleWakeLock"),
  wakeLockRow: document.getElementById("wakeLockRow"),
  resetBtn: document.getElementById("resetBtn"),
};

/** Sets textContent only if it actually changed, to minimize reflow. */
function setText(el, value) {
  if (el.textContent !== value) el.textContent = value;
}

export function renderTime({ mainText, secondsText, showSeconds }) {
  setText(dom.timeMain, mainText);
  if (showSeconds || secondsText.trim() !== "") {
    dom.timeSeconds.hidden = false;
    setText(dom.timeSeconds, secondsText);
  } else {
    dom.timeSeconds.hidden = true;
  }
}

export function renderDate({ day, date, showDate }) {
  setText(dom.dayLabel, day);
  dom.dateLabel.hidden = !showDate;
  if (showDate) setText(dom.dateLabel, date);
}

export function renderZone({ zone, showZone }) {
  dom.zoneLabel.hidden = !showZone;
  if (showZone) setText(dom.zoneLabel, zone);
}

export function renderGreeting({ text, show }) {
  dom.greeting.hidden = !show;
  if (show) setText(dom.greeting, text);
}

export function renderFormatButtons(format) {
  const is24 = format === "24";
  dom.btn24.setAttribute("aria-pressed", String(is24));
  dom.btn12.setAttribute("aria-pressed", String(!is24));
  dom.settingsBtn24.setAttribute("aria-pressed", String(is24));
  dom.settingsBtn12.setAttribute("aria-pressed", String(!is24));
}

export function renderSwitch(el, checked) {
  el.setAttribute("aria-checked", String(checked));
}

export function pulseClock() {
  dom.clock.classList.remove("pulse");
  // Force reflow so the animation can restart.
  void dom.clock.offsetWidth;
  dom.clock.classList.add("pulse");
}

export function announce(message) {
  setText(dom.srStatus, message);
}

export function openSettings() {
  dom.settingsPanel.hidden = false;
  dom.scrim.hidden = false;
  dom.settingsBtn.setAttribute("aria-expanded", "true");
  dom.closeSettingsBtn.focus();
}

export function closeSettings() {
  dom.settingsPanel.hidden = true;
  dom.scrim.hidden = true;
  dom.settingsBtn.setAttribute("aria-expanded", "false");
  dom.settingsBtn.focus();
}

export function isSettingsOpen() {
  return !dom.settingsPanel.hidden;
}

export function setFullscreenIconState(isFullscreen) {
  const enterIcon = dom.fullscreenBtn.querySelector(".icon--enter");
  const exitIcon = dom.fullscreenBtn.querySelector(".icon--exit");
  enterIcon.hidden = isFullscreen;
  exitIcon.hidden = !isFullscreen;
  dom.fullscreenBtn.setAttribute(
    "aria-label",
    isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
  );
  dom.app.classList.toggle("is-fullscreen", isFullscreen);
}

export function hideWakeLockOption() {
  dom.wakeLockRow.hidden = true;
}
