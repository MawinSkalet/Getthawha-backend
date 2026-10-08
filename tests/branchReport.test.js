import { describe, expect, it } from "bun:test";
import { bangkokToday, buildReportBuckets, parseReportQuery } from "../utils/branchReport";

describe("branch report periods in Bangkok", () => {
  it("uses the Thai date when UTC is still the previous day", () => {
    expect(bangkokToday(new Date("2026-10-07T17:01:00Z"))).toBe("2026-10-08");
    const range = parseReportQuery({ view: "day", date: "2026-10-08" });
    expect(range.startUtc.toISOString()).toBe("2026-10-07T17:00:00.000Z");
    expect(range.endUtc.toISOString()).toBe("2026-10-08T17:00:00.000Z");
  });
  it("keeps a Monday–Sunday week intact across years", () => {
    const range = parseReportQuery({ view: "week", date: "2027-01-01" });
    expect([range.start, range.end]).toEqual(["2026-12-28", "2027-01-04"]);
    expect(buildReportBuckets(range, []).map((bin) => bin.start)).toEqual([
      "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03",
    ]);
  });
  it("clips monthly weeks to the month without losing or duplicating totals", () => {
    const range = parseReportQuery({ view: "month", date: "2026-10-08" });
    const bins = buildReportBuckets(range, [
      { key: "2026-09-30", bookings: 10, revenue: "1000" },
      { key: "2026-10-01", bookings: 2, revenue: "300.50" },
      { key: "2026-10-04", bookings: 1, revenue: "100.25" },
      { key: "2026-10-05", bookings: 3, revenue: "500" },
      { key: "2026-10-31", bookings: 1, revenue: "250" },
      { key: "2026-11-01", bookings: 10, revenue: "1000" },
    ]);
    expect(bins.map((bin) => bin.label)).toEqual(["1–4", "5–11", "12–18", "19–25", "26–31"]);
    expect(bins.reduce((sum, bin) => sum + bin.bookings, 0)).toBe(7);
    expect(bins.reduce((sum, bin) => sum + bin.revenue, 0)).toBe(1150.75);
    expect(bins[0].nextDate).toBe("2026-10-01");
    const drillDown = parseReportQuery({ view: bins[0].nextView, date: bins[0].nextDate });
    expect([drillDown.start, drillDown.end]).toEqual(["2026-09-28", "2026-10-05"]);
  });
  it("includes a leap day and all 12 months", () => {
    const month = parseReportQuery({ view: "month", date: "2028-02-29" });
    expect(month.end).toBe("2028-03-01");
    const bins = buildReportBuckets(parseReportQuery({ view: "year", date: "2028-02-29" }), [{ key: "2028-02-29", bookings: 1, revenue: "450" }]);
    expect(bins).toHaveLength(12);
    expect(bins[1].bookings).toBe(1);
    expect(bins[1].nextView).toBe("month");
  });
  it("extends day hours when appointments fall outside normal hours", () => {
    const range = parseReportQuery({ view: "day", date: "2026-10-08" });
    const bins = buildReportBuckets(range, [{ key: "2026-10-08 07:00", bookings: 2, revenue: "450" }, { key: "2026-10-08 23:00", bookings: 1, revenue: "300" }]);
    expect(bins[0].label).toBe("07:00");
    expect(bins.at(-1).label).toBe("23:00");
    expect(bins.reduce((sum, bin) => sum + bin.bookings, 0)).toBe(3);
    expect(buildReportBuckets(range, [])).toHaveLength(12);
  });
  it("rejects malformed and unbounded filters", () => {
    for (const query of [
      { date: "2026-02-30" }, { date: "1999-12-31" }, { date: ["2026-10-08"] },
      { view: "decade" }, { status: "paid" }, { page: "0" }, { page: "1; DROP TABLE bookings" },
      { search: "a".repeat(151) }, { search: {} }, { view: ["day"] },
    ]) expect(() => parseReportQuery(query)).toThrow();
  });
});
