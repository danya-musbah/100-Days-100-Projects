import { PomodoroTimer, MODES, STATUS } from "./timer.js";
import * as storage from "./storage.js";
import * as audio from "./audio.js";
import * as notifications from "./notifications.js";
import * as ui from "./ui.js";

const COMPLETION_COPY = {
  focus: {
    title: "Focus session complete 🎉",
    body: "Time for a break.",
    toast: "+1 Pomodoro completed",
  },
  shortBreak: {
    title: "Break finished ☀️",
    body: "Ready to focus again?",
    toast: "Back to focus?",
  },
  longBreak: {
    title: "Long break finished ☀️",
    body: "Ready for a fresh cycle?",
    toast: "You're doing great.",
  },
};

let settings = storage.loadSettings();

const timer = new PomodoroTimer(settings, {
  onTick: (remainingMs, totalMs, mode) => {
    ui.updateTimerDisplay(remainingMs, totalMs);
    ui.updateDocumentTitle(mode, timer.status, remainingMs);
  },
  onStatusChange: (status, mode) => {
    ui.updateControls(status);
    ui.updateStatusMessage(mode, status);
    ui.updateDocumentTitle(mode, status, timer.remainingMs);
    ui.updateSessionInfo(timer.cyclePosition, timer.config.longBreakInterval, mode, status);
  },
  onModeChange: (mode) => {
    ui.updateMode(mode);
    ui.updateStatusMessage(mode, timer.status);
    ui.updateSessionInfo(timer.cyclePosition, timer.config.longBreakInterval, mode, timer.status);
  },
  onComplete: (finishedMode) => {
    handleCompletion(finishedMode);
  },
});

function handleCompletion(finishedMode) {
  const copy = COMPLETION_COPY[finishedMode];

  if (finishedMode === MODES.focus) {
    const updatedStats = storage.recordCompletedFocus(settings.focus);
    ui.updateStats(updatedStats);
  }

  audio.playCompletionSound(settings.soundEnabled);

  if (settings.notificationsEnabled) {
    notifications.notify(copy.title, copy.body);
  }

  ui.showToast(copy.toast);
}

function renderAll() {
  ui.updateMode(timer.mode);
  ui.updateTimerDisplay(timer.remainingMs, timer.totalMs);
  ui.updateStatusMessage(timer.mode, timer.status);
  ui.updateControls(timer.status);
  ui.updateSessionInfo(timer.cyclePosition, timer.config.longBreakInterval, timer.mode, timer.status);
  ui.updateStats(storage.getTodayStats());
  ui.updateDocumentTitle(timer.mode, timer.status, timer.remainingMs);
}

/* ---------------------------------------------------------------
   Primary controls
   --------------------------------------------------------------- */
ui.dom.primaryBtn.addEventListener("click", () => {
  audio.primeAudio();
  if (timer.status === STATUS.running) {
    timer.pause();
  } else if (timer.status === STATUS.paused) {
    timer.resume();
  } else {
    timer.start();
  }
});

ui.dom.resetBtn.addEventListener("click", () => timer.reset());
ui.dom.skipBtn.addEventListener("click", () => timer.skip());

ui.dom.modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.mode !== timer.mode) {
      timer.setMode(btn.dataset.mode);
    }
  });
});

/* ---------------------------------------------------------------
   Settings modal
   --------------------------------------------------------------- */
ui.dom.settingsBtn.addEventListener("click", () => {
  ui.fillSettingsForm(settings);
  ui.dom.settingsHint.textContent = "";
  ui.openModal(ui.dom.settingsModal);
});
ui.dom.closeSettingsBtn.addEventListener("click", () => ui.closeModal(ui.dom.settingsModal));
ui.dom.cancelSettingsBtn.addEventListener("click", () => ui.closeModal(ui.dom.settingsModal));
ui.dom.settingsModal.addEventListener("click", (event) => {
  if (event.target === ui.dom.settingsModal) ui.closeModal(ui.dom.settingsModal);
});

ui.dom.resetDefaultsBtn.addEventListener("click", () => {
  ui.fillSettingsForm(storage.DEFAULT_SETTINGS);
  ui.dom.settingsHint.textContent = "Defaults loaded — save to apply.";
});

ui.dom.settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const raw = ui.readSettingsForm();
  settings = storage.saveSettings(raw);
  timer.updateConfig(settings);
  ui.updateSessionInfo(timer.cyclePosition, timer.config.longBreakInterval, timer.mode, timer.status);

  if (settings.notificationsEnabled && notifications.getPermission() === "default") {
    await notifications.requestPermission();
  }

  ui.closeModal(ui.dom.settingsModal);
  ui.showToast("Settings saved");
});

/* ---------------------------------------------------------------
   Keyboard shortcuts help modal
   --------------------------------------------------------------- */
ui.dom.helpBtn.addEventListener("click", () => ui.openModal(ui.dom.shortcutsModal));
ui.dom.closeShortcutsBtn.addEventListener("click", () => ui.closeModal(ui.dom.shortcutsModal));
ui.dom.shortcutsModal.addEventListener("click", (event) => {
  if (event.target === ui.dom.shortcutsModal) ui.closeModal(ui.dom.shortcutsModal);
});

/* ---------------------------------------------------------------
   Keyboard shortcuts
   --------------------------------------------------------------- */
const SHORTCUT_MODES = { 1: MODES.focus, 2: MODES.shortBreak, 3: MODES.longBreak };

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping =
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
  if (isTyping) return;
  if (!ui.dom.settingsModal.hidden || !ui.dom.shortcutsModal.hidden) return;

  if (event.code === "Space") {
    event.preventDefault();
    audio.primeAudio();
    if (timer.status === STATUS.running) timer.pause();
    else if (timer.status === STATUS.paused) timer.resume();
    else timer.start();
  } else if (event.key === "r" || event.key === "R") {
    timer.reset();
  } else if (event.key === "s" || event.key === "S") {
    timer.skip();
  } else if (SHORTCUT_MODES[event.key]) {
    const mode = SHORTCUT_MODES[event.key];
    if (mode !== timer.mode) timer.setMode(mode);
  }
});

/* ---------------------------------------------------------------
   Init
   --------------------------------------------------------------- */
renderAll();

if (!storage.isStorageAvailable()) {
  ui.showToast("Your settings won't be saved on this browser.");
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Offline support is optional; ignore registration failures.
    });
  });
}
