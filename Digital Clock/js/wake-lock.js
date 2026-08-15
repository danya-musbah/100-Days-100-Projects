// wake-lock.js — Screen Wake Lock API with feature detection and

let wakeLockSentinel = null;
let desiredState = false;

export function isWakeLockSupported() {
  return "wakeLock" in navigator;
}

export async function requestWakeLock() {
  if (!isWakeLockSupported()) return false;
  desiredState = true;
  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    wakeLockSentinel.addEventListener("release", () => {
      wakeLockSentinel = null;
    });
    return true;
  } catch (err) {
    // Request can fail if the document isn't visible or user denies it.
    wakeLockSentinel = null;
    return false;
  }
}

export async function releaseWakeLock() {
  desiredState = false;
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (err) {
      // Ignore.
    }
    wakeLockSentinel = null;
  }
}

/**
 * Call on visibilitychange — re-acquires the lock if it was desired
 * but got dropped (browsers auto-release when a tab is hidden).
 */
export async function reacquireIfNeeded() {
  if (desiredState && document.visibilityState === "visible" && !wakeLockSentinel) {
    await requestWakeLock();
  }
}

export function isWakeLockActive() {
  return Boolean(wakeLockSentinel);
}
