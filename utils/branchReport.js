const DAY = 86400000;
export const REPORT_TIMEZONE = "Asia/Bangkok";
export const BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

export function bangkokToday(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

function parseDate(key) {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const date = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key
    && date.getUTCFullYear() >= 2000 && date.getUTCFullYear() <= 2200 ? date : null;
}

const keyOf = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => new Date(date.getTime() + days * DAY);
const monday = (date) => addDays(date, -((date.getUTCDay() + 6) % 7));
const format = (key, options) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });

export function parseReportQuery(query, now) {
  const view = query.view ?? "month";
  const date = query.date ?? bangkokToday(now);
  const status = query.status ?? "all";
  const search = query.search ?? "";
  const pageText = query.page ?? "1";
  if (!["day", "week", "month", "year"].includes(view) || !parseDate(date)
    || !["all", ...BOOKING_STATUSES].includes(status) || typeof search !== "string"
    || search.length > 150 || typeof pageText !== "string" || !/^[1-9]\d{0,6}$/.test(pageText)) {
    throw new Error("Invalid report filters. Use a valid view, date (2000–2200), status and page.");
  }
  const anchor = parseDate(date);
  let start = anchor;
  let end = addDays(start, 1);
  if (view === "week") { start = monday(anchor); end = addDays(start, 7); }
  if (view === "month") {
    start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
  }
  if (view === "year") {
    start = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1));
    end = new Date(Date.UTC(anchor.getUTCFullYear() + 1, 0, 1));
  }
  return {
    view, date, status, search: search.trim(), page: Number(pageText), pageSize: 10,
    start: keyOf(start), end: keyOf(end),
    // Bangkok has no daylight-saving transitions in the supported reporting years.
    startUtc: new Date(start.getTime() - 7 * 3600000),
    endUtc: new Date(end.getTime() - 7 * 3600000),
  };
}

export function buildReportBuckets(range, dailyTotals) {
  const bins = [];
  const start = new Date(`${range.start}T00:00:00Z`);
  const end = new Date(`${range.end}T00:00:00Z`);
  if (range.view === "day") {
    const hours = dailyTotals.map((row) => Number(row.key.slice(11, 13)));
    const min = Math.min(9, ...hours), max = Math.max(20, ...hours);
    for (let hour = min; hour <= max; hour++) {
      const label = `${String(hour).padStart(2, "0")}:00`;
      bins.push({ key: `${range.start} ${label}`, label, fullLabel: `${format(range.start, { day: "numeric", month: "short", year: "numeric" })}, ${label}–${String(hour + 1).padStart(2, "0")}:00` });
    }
  } else if (range.view === "year") {
    for (let month = 0; month < 12; month++) {
      const date = new Date(Date.UTC(start.getUTCFullYear(), month, 1));
      bins.push({ start: keyOf(date), end: keyOf(new Date(Date.UTC(start.getUTCFullYear(), month + 1, 1))), label: format(keyOf(date), { month: "short" }), fullLabel: format(keyOf(date), { month: "long", year: "numeric" }), nextView: "month", nextDate: keyOf(date) });
    }
  } else {
    for (let cursor = start; cursor < end;) {
      const next = range.view === "week" ? addDays(cursor, 1) : new Date(Math.min(addDays(monday(cursor), 7).getTime(), end.getTime()));
      const first = keyOf(cursor), last = keyOf(addDays(next, -1));
      bins.push({ start: first, end: keyOf(next), label: range.view === "week" ? format(first, { weekday: "short", day: "numeric" }) : `${cursor.getUTCDate()}–${addDays(next, -1).getUTCDate()}`, fullLabel: range.view === "week" ? format(first, { weekday: "long", day: "numeric", month: "short", year: "numeric" }) : `${format(first, { day: "numeric", month: "short" })} – ${format(last, { day: "numeric", month: "short", year: "numeric" })}`, nextView: range.view === "week" ? "day" : "week", nextDate: first });
      cursor = next;
    }
  }
  return bins.map((bin) => {
    const rows = dailyTotals.filter((row) => bin.key ? row.key === bin.key : row.key >= bin.start && row.key < bin.end);
    return { ...bin, bookings: rows.reduce((sum, row) => sum + Number(row.bookings), 0), revenue: Math.round(rows.reduce((sum, row) => sum + Number(row.revenue), 0) * 100) / 100 };
  });
}
