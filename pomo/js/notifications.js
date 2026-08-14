// notifications.js — thin wrapper around the Notifications API.
// Every call is defensive: unsupported browsers or denied permission
// must never break the timer itself.

export function notificationsSupported() {
  return "Notification" in window;
}

export function getPermission() {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestPermission() {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function notify(title, body) {
  if (!notificationsSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "assets/icon.svg",
      tag: "pomo-session",
    });
  } catch {
    // A failed notification should never interrupt the timer.
  }
}
