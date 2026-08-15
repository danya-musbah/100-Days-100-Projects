import {
  formatMainTime,
  formatSecondsSuffix,
  formatTitleTime,
  formatDayName,
  formatFullDate,
  getTimezoneName,
  getGreeting,
  dateKey,
} from "./clock.js";

import { SettingsStore } from "./settings.js";

import * as ui from "./ui.js";

import {
  isFullscreenSupported,
  isFullscreenActive,
  enterFullscreen,
  exitFullscreen,
  onFullscreenChange,
} from "./fullscreen.js";

import {
  isWakeLockSupported,
  requestWakeLock,
  releaseWakeLock,
  reacquireIfNeeded,
} from "./wake-lock.js";

const settings = new SettingsStore();
const timezoneName = getTimezoneName();

let lastMinuteKey = "";
let lastDateKey = "";
let tickHandle = null;

/* --------------------------------------------------------------------
   Core render — reads the real system clock via `new Date()` every call.
   -------------------------------------------------------------------- */
function render() {
  const now = new Date();
  const s = settings.state;

  const mainText = formatMainTime(now, s.timeFormat);
  const secondsText = formatSecondsSuffix(now, s.timeFormat, s.showSeconds);
  ui.renderTime({ mainText, secondsText, showSeconds: s.showSeconds });

  ui.renderDate({
    day: formatDayName(now),
    date: formatFullDate(now),
    showDate: s.showDate,
  });

  ui.renderZone({
    zone: timezoneName || "LOCAL TIME",
    showZone: s.showTimezone,
  });

  ui.renderGreeting({ text: getGreeting(now), show: s.showGreeting });

  document.title = `${formatTitleTime(now, s.timeFormat, s.showSeconds)} — NIGHT CLOCK`;

  const minuteKey = `${now.getHours()}:${now.getMinutes()}`;
  if (lastMinuteKey && minuteKey !== lastMinuteKey) {
    ui.pulseClock();
  }
  lastMinuteKey = minuteKey;

  const todayKey = dateKey(now);
  if (lastDateKey && todayKey !== lastDateKey) {
    ui.announce(`New day: ${formatDayName(now)}, ${formatFullDate(now)}`);
  }
  lastDateKey = todayKey;
}

/* --------------------------------------------------------------------
   Scheduling — always resync to the real clock rather than trusting a
   naive 1000ms interval to fire exactly on time.
   -------------------------------------------------------------------- */
function scheduleNextTick() {
  if (tickHandle) clearTimeout(tickHandle);
  const now = new Date();
  const msUntilNextSecond = 1000 - now.getMilliseconds();
  tickHandle = setTimeout(() => {
    render();
    scheduleNextTick();
  }, Math.max(50, msUntilNextSecond));
}

function resync() {
  render();
  scheduleNextTick();
}

/* --------------------------------------------------------------------
   Settings <-> UI bindings
   -------------------------------------------------------------------- */
function applySettingsToUI(state) {
  ui.renderFormatButtons(state.timeFormat);
  ui.renderSwitch(ui.dom.toggleSeconds, state.showSeconds);
  ui.renderSwitch(ui.dom.toggleDate, state.showDate);
  ui.renderSwitch(ui.dom.toggleTimezone, state.showTimezone);
  ui.renderSwitch(ui.dom.toggleGreeting, state.showGreeting);
  ui.renderSwitch(ui.dom.toggleWakeLock, state.keepAwake);
  render();
}

settings.subscribe(applySettingsToUI);

function bindFormatButtons() {
  const handler = (format) => () => settings.setTimeFormat(format);
  ui.dom.btn24.addEventListener("click", handler("24"));
  ui.dom.btn12.addEventListener("click", handler("12"));
  ui.dom.settingsBtn24.addEventListener("click", handler("24"));
  ui.dom.settingsBtn12.addEventListener("click", handler("12"));
}

function bindSwitches() {
  ui.dom.toggleSeconds.addEventListener("click", () => settings.toggle("showSeconds"));
  ui.dom.toggleDate.addEventListener("click", () => settings.toggle("showDate"));
  ui.dom.toggleTimezone.addEventListener("click", () => settings.toggle("showTimezone"));
  ui.dom.toggleGreeting.addEventListener("click", () => settings.toggle("showGreeting"));
  ui.dom.toggleWakeLock.addEventListener("click", async () => {
    const next = !settings.state.keepAwake;
    if (next) {
      const ok = await requestWakeLock();
      settings.set("keepAwake", ok);
    } else {
      await releaseWakeLock();
      settings.set("keepAwake", false);
    }
  });
  ui.dom.resetBtn.addEventListener("click", () => {
    releaseWakeLock();
    settings.reset();
    ui.announce("Settings reset to defaults.");
  });
}

/* --------------------------------------------------------------------
   Settings panel open/close
   -------------------------------------------------------------------- */
function bindSettingsPanel() {
  ui.dom.settingsBtn.addEventListener("click", () => ui.openSettings());
  ui.dom.closeSettingsBtn.addEventListener("click", () => ui.closeSettings());
  ui.dom.scrim.addEventListener("click", () => ui.closeSettings());
}

/* --------------------------------------------------------------------
   Fullscreen
   -------------------------------------------------------------------- */
function bindFullscreen() {
  if (!isFullscreenSupported()) {
    ui.dom.fullscreenBtn.hidden = true;
    return;
  }
  ui.dom.fullscreenBtn.addEventListener("click", async () => {
    if (isFullscreenActive()) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  });
  onFullscreenChange(() => {
    ui.setFullscreenIconState(isFullscreenActive());
  });
}

/* --------------------------------------------------------------------
   Wake Lock availability
   -------------------------------------------------------------------- */
function initWakeLock() {
  if (!isWakeLockSupported()) {
    ui.hideWakeLockOption();
    if (settings.state.keepAwake) settings.set("keepAwake", false);
    return;
  }
  if (settings.state.keepAwake) {
    requestWakeLock().then((ok) => {
      if (!ok) settings.set("keepAwake", false);
    });
  }
}

/* --------------------------------------------------------------------
   Keyboard shortcuts
   -------------------------------------------------------------------- */
function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

function bindKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (isTypingTarget(document.activeElement)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    switch (event.key.toLowerCase()) {
      case "s":
        settings.toggle("showSeconds");
        break;
      case "d":
        settings.toggle("showDate");
        break;
      case "t":
        settings.toggle("showTimezone");
        break;
      case "f":
        settings.setTimeFormat(settings.state.timeFormat === "24" ? "12" : "24");
        break;
      case "escape":
        if (ui.isSettingsOpen()) ui.closeSettings();
        break;
      default:
        return;
    }
  });
}

/* --------------------------------------------------------------------
   Visibility & accuracy safeguards
   -------------------------------------------------------------------- */
function bindVisibility() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      resync();
      reacquireIfNeeded();
    }
  });
  window.addEventListener("focus", resync);
  window.addEventListener("pageshow", resync);
}

/* --------------------------------------------------------------------
   Init
   -------------------------------------------------------------------- */
function init() {
  applySettingsToUI(settings.state);
  bindFormatButtons();
  bindSwitches();
  bindSettingsPanel();
  bindFullscreen();
  bindKeyboardShortcuts();
  bindVisibility();
  initWakeLock();
  resync();
}

init();
