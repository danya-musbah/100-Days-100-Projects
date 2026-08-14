// ui.js — all DOM reads/writes live here, so timer.js stays a pure
// state machine. Every function takes plain data and renders it.

const MODE_LABELS = {
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

const STATUS_MESSAGES = {
  focus: {
    idle: "Ready when you are.",
    running: "Stay focused.",
    paused: "Paused. Pick up whenever you're ready.",
    completed: "Nice work!",
  },
  shortBreak: {
    idle: "Take a breath.",
    running: "Rest a little.",
    paused: "Paused. Your break is waiting.",
    completed: "Break's over — back to focus?",
  },
  longBreak: {
    idle: "You've earned this one.",
    running: "Recharge fully.",
    paused: "Paused. Take your time.",
    completed: "You're doing great.",
  },
};

export const dom = {
  timerCard: document.querySelector(".timer-card"),
  ringProgress: document.getElementById("ringProgress"),
  timerTime: document.getElementById("timerTime"),
  timerStatus: document.getElementById("timerStatus"),
  modeButtons: Array.from(document.querySelectorAll(".mode-btn")),
  primaryBtn: document.getElementById("primaryBtn"),
  primaryLabel: document.getElementById("primaryLabel"),
  primaryIconPlay: document.getElementById("primaryIconPlay"),
  primaryIconPause: document.getElementById("primaryIconPause"),
  resetBtn: document.getElementById("resetBtn"),
  skipBtn: document.getElementById("skipBtn"),
  sessionLabel: document.getElementById("sessionLabel"),
  sessionDots: document.getElementById("sessionDots"),
  statPomodoros: document.getElementById("statPomodoros"),
  statMinutes: document.getElementById("statMinutes"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  cancelSettingsBtn: document.getElementById("cancelSettingsBtn"),
  settingsForm: document.getElementById("settingsForm"),
  settingsHint: document.getElementById("settingsHint"),
  resetDefaultsBtn: document.getElementById("resetDefaultsBtn"),
  helpBtn: document.getElementById("helpBtn"),
  shortcutsModal: document.getElementById("shortcutsModal"),
  closeShortcutsBtn: document.getElementById("closeShortcutsBtn"),
  toast: document.getElementById("toast"),
};

const RING_RADIUS = Number(dom.ringProgress.getAttribute("r"));
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
dom.ringProgress.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;

export function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function updateTimerDisplay(remainingMs, totalMs) {
  dom.timerTime.textContent = formatTime(remainingMs);
  const fraction = totalMs > 0 ? 1 - remainingMs / totalMs : 0;
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, fraction)));
  dom.ringProgress.style.strokeDashoffset = `${offset}`;
}

export function updateMode(mode) {
  dom.timerCard.dataset.mode = mode;
  document.body.dataset.mode = mode;
  dom.modeButtons.forEach((btn) => {
    const isActive = btn.dataset.mode === mode;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
}

export function updateStatusMessage(mode, status) {
  dom.timerStatus.textContent = STATUS_MESSAGES[mode]?.[status] ?? "";
}

function setSvgHidden(svgEl, isHidden) {
  if (isHidden) svgEl.setAttribute("hidden", "");
  else svgEl.removeAttribute("hidden");
}

export function updateControls(status) {
  const isRunning = status === "running";
  setSvgHidden(dom.primaryIconPlay, isRunning);
  setSvgHidden(dom.primaryIconPause, !isRunning);
  dom.primaryLabel.textContent = isRunning ? "Pause" : status === "paused" ? "Resume" : "Start";
  dom.primaryBtn.setAttribute("aria-label", dom.primaryLabel.textContent + " timer");
}

export function updateSessionInfo(cyclePosition, longBreakInterval, mode, status) {
  const current = mode === "focus" ? Math.min(cyclePosition + 1, longBreakInterval) : cyclePosition;
  dom.sessionLabel.textContent =
    mode === "focus"
      ? `Session ${current} of ${longBreakInterval}`
      : `${current} of ${longBreakInterval} focus sessions done`;

  dom.sessionDots.innerHTML = "";
  for (let i = 0; i < longBreakInterval; i += 1) {
    const dot = document.createElement("span");
    dot.className = "dot";
    const filled = mode === "focus" && status === "running" ? i < cyclePosition : i < cyclePosition;
    if (filled) dot.classList.add("is-filled");
    dom.sessionDots.appendChild(dot);
  }
}

export function updateStats(stats) {
  dom.statPomodoros.textContent = String(stats.pomodoros);
  dom.statMinutes.textContent = String(stats.minutes);
}

export function updateDocumentTitle(mode, status, remainingMs) {
  const time = formatTime(remainingMs);
  if (status === "completed") {
    document.title = "Session Complete — POMO";
    return;
  }
  if (status === "paused") {
    document.title = `${time} — Paused | POMO`;
    return;
  }
  const label = mode === "focus" ? "Focus" : "Break";
  document.title = `${time} — ${label} | POMO`;
}

export function fillSettingsForm(settings) {
  dom.settingsForm.focus.value = settings.focus;
  dom.settingsForm.shortBreak.value = settings.shortBreak;
  dom.settingsForm.longBreak.value = settings.longBreak;
  dom.settingsForm.longBreakInterval.value = settings.longBreakInterval;
  dom.settingsForm.soundEnabled.checked = settings.soundEnabled;
  dom.settingsForm.autoStart.checked = settings.autoStart;
  dom.settingsForm.notificationsEnabled.checked = settings.notificationsEnabled;
}

export function readSettingsForm() {
  const data = new FormData(dom.settingsForm);
  return {
    focus: data.get("focus"),
    shortBreak: data.get("shortBreak"),
    longBreak: data.get("longBreak"),
    longBreakInterval: data.get("longBreakInterval"),
    soundEnabled: dom.settingsForm.soundEnabled.checked,
    autoStart: dom.settingsForm.autoStart.checked,
    notificationsEnabled: dom.settingsForm.notificationsEnabled.checked,
  };
}

export function openModal(modalEl) {
  modalEl.hidden = false;
  const focusable = modalEl.querySelector("input, button");
  focusable?.focus();
  document.addEventListener("keydown", trapEscape(modalEl));
}

export function closeModal(modalEl) {
  modalEl.hidden = true;
}

function trapEscape(modalEl) {
  function handler(event) {
    if (event.key === "Escape" && !modalEl.hidden) {
      closeModal(modalEl);
      document.removeEventListener("keydown", handler);
    }
  }
  return handler;
}

let toastTimeoutId = null;
export function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, 3200);
}

export function modeLabel(mode) {
  return MODE_LABELS[mode];
}
