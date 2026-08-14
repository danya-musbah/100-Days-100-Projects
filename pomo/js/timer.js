// timer.js — a timestamp-based Pomodoro state machine.
// The remaining time is always derived from Date.now() vs. an end
// timestamp, so throttled tabs, sleep/wake, and long pauses can never
// desynchronize the displayed time from real elapsed time.

export const MODES = {
  focus: "focus",
  shortBreak: "shortBreak",
  longBreak: "longBreak",
};

export const STATUS = {
  idle: "idle",
  running: "running",
  paused: "paused",
  completed: "completed",
};

export class PomodoroTimer {
  /**
   * @param {object} config durations in minutes + longBreakInterval
   * @param {object} callbacks onTick, onStatusChange, onModeChange, onComplete
   */
  constructor(config, callbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;

    this.mode = MODES.focus;
    this.status = STATUS.idle;
    this.cyclePosition = 0; // completed focus sessions since the last long break

    this.totalMs = this.durationFor(this.mode);
    this.remainingMs = this.totalMs;
    this.endTime = null;
    this.rafId = null;
  }

  durationFor(mode) {
    const minutesByMode = {
      [MODES.focus]: this.config.focus,
      [MODES.shortBreak]: this.config.shortBreak,
      [MODES.longBreak]: this.config.longBreak,
    };
    return minutesByMode[mode] * 60 * 1000;
  }

  updateConfig(config) {
    this.config = config;
    if (this.status === STATUS.idle) {
      this.totalMs = this.durationFor(this.mode);
      this.remainingMs = this.totalMs;
      this.emitTick();
    }
  }

  setStatus(status) {
    this.status = status;
    this.callbacks.onStatusChange?.(status, this.mode);
  }

  /** Switch to a mode without affecting cycle bookkeeping (manual mode select). */
  setMode(mode) {
    this.cancelLoop();
    this.mode = mode;
    this.totalMs = this.durationFor(mode);
    this.remainingMs = this.totalMs;
    this.endTime = null;
    this.setStatus(STATUS.idle);
    this.callbacks.onModeChange?.(mode);
    this.emitTick();
  }

  start() {
    if (this.status === STATUS.running) return;
    if (this.status === STATUS.idle || this.status === STATUS.completed) {
      this.remainingMs = this.totalMs;
    }
    this.endTime = Date.now() + this.remainingMs;
    this.setStatus(STATUS.running);
    this.runLoop();
  }

  pause() {
    if (this.status !== STATUS.running) return;
    this.remainingMs = Math.max(0, this.endTime - Date.now());
    this.cancelLoop();
    this.setStatus(STATUS.paused);
  }

  resume() {
    if (this.status !== STATUS.paused) return;
    this.endTime = Date.now() + this.remainingMs;
    this.setStatus(STATUS.running);
    this.runLoop();
  }

  /** Reset the current mode back to its starting duration. */
  reset() {
    this.cancelLoop();
    this.totalMs = this.durationFor(this.mode);
    this.remainingMs = this.totalMs;
    this.endTime = null;
    this.setStatus(STATUS.idle);
    this.emitTick();
  }

  /** Move to the next appropriate session without counting this one as completed. */
  skip() {
    this.cancelLoop();
    this.advanceMode({ countSession: false });
  }

  runLoop() {
    const tick = () => {
      if (this.status !== STATUS.running) return;
      const remaining = this.endTime - Date.now();
      if (remaining <= 0) {
        this.remainingMs = 0;
        this.emitTick();
        this.completeSession();
        return;
      }
      this.remainingMs = remaining;
      this.emitTick();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  cancelLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  emitTick() {
    this.callbacks.onTick?.(this.remainingMs, this.totalMs, this.mode);
  }

  completeSession() {
    this.cancelLoop();
    this.setStatus(STATUS.completed);
    const finishedMode = this.mode;
    this.callbacks.onComplete?.(finishedMode);
    this.advanceMode({ countSession: true });
    if (this.config.autoStart) {
      this.start();
    }
  }

  advanceMode({ countSession }) {
    let nextMode;
    if (this.mode === MODES.focus) {
      if (countSession) {
        this.cyclePosition += 1;
      }
      const cycleComplete = this.cyclePosition >= this.config.longBreakInterval;
      nextMode = cycleComplete ? MODES.longBreak : MODES.shortBreak;
      if (cycleComplete && countSession) {
        this.cyclePosition = 0;
      }
    } else {
      nextMode = MODES.focus;
    }
    this.mode = nextMode;
    this.totalMs = this.durationFor(nextMode);
    this.remainingMs = this.totalMs;
    this.endTime = null;
    this.setStatus(STATUS.idle);
    this.callbacks.onModeChange?.(nextMode);
    this.emitTick();
  }
}
