// fullscreen.js — Fullscreen API handling with graceful fallback.

function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement ||
    null
  );
}

export function isFullscreenSupported() {
  return Boolean(
    document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen ||
      document.documentElement.msRequestFullscreen
  );
}

export function isFullscreenActive() {
  return Boolean(getFullscreenElement());
}

export async function enterFullscreen(el = document.documentElement) {
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
    }
  } catch (err) {
    // Some browsers reject if not triggered by a direct user gesture,
    // or fullscreen is disallowed (e.g. iframe without allow="fullscreen").
  }
}

export async function exitFullscreen() {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
    }
  } catch (err) {
    // Ignore.
  }
}

export function onFullscreenChange(callback) {
  const events = ["fullscreenchange", "webkitfullscreenchange", "MSFullscreenChange"];
  events.forEach((evt) => document.addEventListener(evt, callback));
  return () => events.forEach((evt) => document.removeEventListener(evt, callback));
}
