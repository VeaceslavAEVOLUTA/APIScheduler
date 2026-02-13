import { config } from "../config.js";

type TimeWindow = {
  from?: string | null;
  to?: string | null;
  timezone?: string | null;
};

function parseTime(value?: string | null) {
  if (!value) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getMinutesInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

export function isWithinActiveWindow(window: TimeWindow) {
  const start = parseTime(window.from);
  const end = parseTime(window.to);
  if (start === null || end === null) return true;
  const tz = window.timezone || config.defaultTimezone;
  const now = getMinutesInTimezone(tz);
  if (start <= end) {
    return now >= start && now <= end;
  }
  return now >= start || now <= end;
}
