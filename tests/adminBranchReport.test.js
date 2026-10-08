import { describe, expect, it, mock } from "bun:test";

let captured = [], missingBranch = false;
const id = "11111111-1111-4111-8111-111111111111";
const emptyId = "22222222-2222-4222-8222-222222222222";
mock.module("../models/index", () => ({
  User: {}, UserStaff: {}, Package: {}, Voucher: {}, Review: {},
  Branch: {
    findByPk: async () => missingBranch ? null : { id, name: "Rimping" },
    findAll: async () => [{ id, name: "Rimping" }, { id: emptyId, name: "Empty branch" }],
  },
  Booking: { sequelize: {
    transaction: async (_options, fn) => fn({}),
    query: async (sql, options) => {
      captured.push({ sql, ...options });
      if (sql.includes("COUNT(DISTINCT")) return [{ bookings: "3", customers: "2", revenue: "750.50", pending: "1", confirmed: "1", completed: "1", cancelled: "0" }];
      if (sql.includes("to_char")) return [{ key: "2026-10-01", bookings: "3", revenue: "750.50" }];
      if (sql.includes("GROUP BY b.\"packageId\"")) return [];
      if (sql.includes("COUNT(*) AS total")) return [{ total: "1" }];
      return [{ id: "booking", totalPrice: "300.50", customerName: "Snapshot customer" }];
    },
  } },
}));
const { getBranchReport, getDashboardPerformance } = await import("../services/adminBranchReport.services");
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, set() {} });

describe("authenticated branch report handler", () => {
  it("aggregates all branches with the same revenue rule and Bangkok buckets", async () => {
    captured = [];
    const res = response();
    await getDashboardPerformance({ query: { date: "2026-10-08", view: "month" } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.statistics).toEqual({ bookings: 3, customers: 2, revenue: 750.50, pending: 1 });
    expect(res.body.data.chart.reduce((sum, bin) => sum + bin.bookings, 0)).toBe(3);
    expect(res.body.data.chart.reduce((sum, bin) => sum + bin.revenue, 0)).toBe(750.50);
    expect(captured).toHaveLength(2);
    for (const query of captured) {
      expect(query.sql).toContain('b.date >= :start AND b.date < :end');
      expect(query.sql).not.toContain('"branchId"');
      expect(query.replacements.branchId).toBeUndefined();
      expect(query.replacements.start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
      expect(query.replacements.end.toISOString()).toBe("2026-10-31T17:00:00.000Z");
      expect(query.sql).toContain("WHERE b.status IN ('confirmed', 'completed')");
    }
  });
  it("rejects invalid dashboard periods before querying", async () => {
    captured = [];
    const res = response();
    await getDashboardPerformance({ query: { date: "2026-02-30", view: "day" } }, res);
    expect(res.statusCode).toBe(400);
    expect(captured).toHaveLength(0);
  });
  it("scopes every query to the branch and half-open Bangkok appointment interval", async () => {
    captured = [];
    const res = response();
    await getBranchReport({ params: { branchId: id }, query: { date: "2026-10-08", view: "month", status: "pending", search: "O'Brien_%", page: "999" } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.statistics).toEqual({ bookings: 3, customers: 2, revenue: 750.50, pending: 1 });
    expect(res.body.data.branches).toHaveLength(2);
    expect(res.body.data.appointments.page).toBe(1);
    expect(res.body.data.appointments.rows[0].totalPrice).toBe(300.50);
    for (const query of captured) {
      expect(query.sql).toContain('b."branchId" = :branchId AND b.date >= :start AND b.date < :end');
      expect(query.replacements.branchId).toBe(id);
      expect(query.replacements.start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
      expect(query.replacements.end.toISOString()).toBe("2026-10-31T17:00:00.000Z");
      expect(query.sql).not.toContain("O'Brien");
    }
    expect(captured[0].sql).toContain("WHERE b.status IN ('confirmed', 'completed')");
    const listing = captured.at(-1);
    expect(listing.sql).toContain("b.status = :status");
    expect(listing.sql).toContain('COALESCE(NULLIF(b."customerName", \'\'), u."displayName"');
    expect(listing.replacements.search).toBe("%O'Brien\\_\\%%");
    expect(listing.replacements.limit).toBe(10);
    expect(listing.replacements.offset).toBe(0);
    // Search/status affect only the appointment list, not the summary or chart.
    expect(captured[0].sql).not.toContain(":status");
    expect(captured[1].sql).not.toContain(":search");
  });
  it("returns 400 for invalid input and 404 for an unknown branch", async () => {
    captured = [];
    const invalid = response();
    await getBranchReport({ params: { branchId: "invalid" }, query: {} }, invalid);
    expect(invalid.statusCode).toBe(400);
    expect(captured).toHaveLength(0);
    missingBranch = true;
    const missing = response();
    await getBranchReport({ params: { branchId: id }, query: {} }, missing);
    expect(missing.statusCode).toBe(404);
    missingBranch = false;
  });
});
