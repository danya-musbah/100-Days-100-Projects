// clock.js — time/date formatting, timezone detection, and greeting logic.

let timeFormatterCache = null;
let timeFormatterKey = "";

let dayFormatter = null;
let dateFormatter = null;

/**
 * Returns { hours, minutes, seconds, meridiem } for the given format.
 */
export function getTimeParts(date, timeFormat) {
  const key = `time-${timeFormat}`;
  if (timeFormatterKey !== key) {
    timeFormatterCache = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: timeFormat === "12",
      hourCycle: timeFormat === "24" ? "h23" : undefined,
    });
    timeFormatterKey = key;
  }

  const parts = timeFormatterCache.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    hours: get("hour"),
    minutes: get("minute"),
    seconds: get("second"),
    meridiem: get("dayPeriod").toUpperCase(),
  };
}

/**
 * Formats "07:42" (main) — hours:minutes only.
 */
export function formatMainTime(date, timeFormat) {
  const { hours, minutes } = getTimeParts(date, timeFormat);
  return `${hours}:${minutes}`;
}

/**
 * Formats the seconds segment, e.g. ":18" or ":18 PM" for 12h format.
 */
export function formatSecondsSuffix(date, timeFormat, showSeconds) {
  const { seconds, meridiem } = getTimeParts(date, timeFormat);
  const secPart = showSeconds ? `:${seconds}` : "";
  const meridiemPart = timeFormat === "12" ? ` ${meridiem}` : "";
  return `${secPart}${meridiemPart}`;
}

/**
 * Formats the compact title-bar time, e.g. "07:42" or "07:42:18".
 */
export function formatTitleTime(date, timeFormat, showSeconds) {
  const { hours, minutes, seconds, meridiem } = getTimeParts(date, timeFormat);
  const base = showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
  return timeFormat === "12" ? `${base} ${meridiem}` : base;
}

export function formatDayName(date) {
  if (!dayFormatter) {
    dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });
  }
  return dayFormatter.format(date).toUpperCase();
}

export function formatFullDate(date) {
  if (!dateFormatter) {
    dateFormatter = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return dateFormatter.format(date).toUpperCase();
}

/**
 * Returns the IANA timezone name, or null if unavailable.
 */
export function getTimezoneName() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || null;
  } catch (err) {
    return null;
  }
}

/**
 * Returns a contextual greeting based on the current hour (0-23).
 */
export function getGreeting(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "GOOD MORNING";
  if (hour >= 12 && hour < 17) return "GOOD AFTERNOON";
  if (hour >= 17 && hour < 21) return "GOOD EVENING";
  return "GOOD NIGHT";
}

/**
 * Returns a date-only key (YYYY-MM-DD, local) used to detect day rollovers.
 */
export function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
