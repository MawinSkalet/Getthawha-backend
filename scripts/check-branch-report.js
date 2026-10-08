// Read-only integration check against the configured database. Run with Bun.
import assert from "node:assert/strict";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/database";
import { Branch } from "../models/index";
import { getBranchReport, getDashboardPerformance } from "../services/adminBranchReport.services";
import { parseReportQuery } from "../utils/branchReport";

async function report(branchId, query) {
  const res = { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, set() {} };
  await getBranchReport({ params: { branchId }, query }, res);
  assert.equal(res.code, 200, res.body?.message);
  return res.body.data;
}

async function dashboard(query) {
  const res = { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, set() {} };
  await getDashboardPerformance({ query }, res);
  assert.equal(res.code, 200, res.body?.message);
  return res.body.data;
}

try {
  const branches = await Branch.findAll({ where: { deletedAt: null }, attributes: ["id"], raw: true });
  assert.ok(branches.length, "At least one branch is needed for this check.");
  const [latest] = await sequelize.query("SELECT MAX(date) AS date FROM bookings", { type: QueryTypes.SELECT });
  const anchor = latest.date ? new Date(new Date(latest.date).getTime() + 7 * 3600000).toISOString().slice(0, 10) : "2026-10-08";
  let checked = 0;
  for (const view of ["day", "week", "month", "year"]) {
    const range = parseReportQuery({ view, date: anchor });
    const [expected] = await sequelize.query(`SELECT COUNT(*) AS bookings, COUNT(DISTINCT "userId") AS customers,
      COALESCE(SUM("totalPrice") FILTER (WHERE status IN ('confirmed', 'completed')), 0) AS revenue,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending FROM bookings WHERE date >= :start AND date < :end`,
    { type: QueryTypes.SELECT, replacements: { start: range.startUtc, end: range.endUtc } });
    const data = await dashboard({ view, date: anchor });
    for (const field of ["bookings", "customers", "revenue", "pending"]) assert.equal(data.statistics[field], Number(expected[field]), `All branches ${view} ${field}`);
    assert.equal(data.chart.reduce((sum, bin) => sum + bin.bookings, 0), data.statistics.bookings);
    assert.ok(Math.abs(data.chart.reduce((sum, bin) => sum + bin.revenue, 0) - data.statistics.revenue) < .005);
  }
  const emptyDashboard = await dashboard({ view: "year", date: "2199-01-01" });
  assert.equal(emptyDashboard.statistics.bookings, 0);
  assert.equal(emptyDashboard.statistics.revenue, 0);
  assert.equal(emptyDashboard.chart.length, 12);
  for (const branch of branches) {
    for (const view of ["day", "week", "month", "year"]) {
      const range = parseReportQuery({ view, date: anchor });
      const [expected] = await sequelize.query(`SELECT COUNT(*) AS bookings, COUNT(DISTINCT "userId") AS customers,
        COALESCE(SUM("totalPrice") FILTER (WHERE status IN ('confirmed', 'completed')), 0) AS revenue,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending FROM bookings WHERE "branchId" = :id AND date >= :start AND date < :end`,
      { type: QueryTypes.SELECT, replacements: { id: branch.id, start: range.startUtc, end: range.endUtc } });
      const data = await report(branch.id, { view, date: anchor });
      for (const field of ["bookings", "customers", "revenue", "pending"]) assert.equal(data.statistics[field], Number(expected[field]), `${view} ${field}`);
      assert.equal(data.chart.reduce((sum, bin) => sum + bin.bookings, 0), data.statistics.bookings);
      assert.ok(Math.abs(data.chart.reduce((sum, bin) => sum + bin.revenue, 0) - data.statistics.revenue) < .005);
      assert.equal(Object.values(data.statusCounts).reduce((sum, value) => sum + value, 0), data.statistics.bookings);
      assert.equal(data.appointments.total, data.statistics.bookings);
      assert.equal(data.branches.length, branches.length);
      checked++;
    }
  }
  const empty = await report(branches[0].id, { view: "year", date: "2199-01-01" });
  assert.equal(empty.statistics.bookings, 0);
  assert.equal(empty.appointments.total, 0);
  assert.equal(empty.chart.length, 12);
  const filtered = await report(branches[0].id, { view: "year", date: anchor, status: "pending", search: "%_'", page: "99" });
  assert.equal(filtered.appointments.total, 0);
  assert.equal(filtered.appointments.page, 1);
  const all = await report(branches[0].id, { view: "year", date: anchor });
  assert.deepEqual(filtered.statistics, all.statistics, "List filters must preserve period totals.");
  const first = all.appointments.rows[0];
  if (first?.customerName) {
    const matched = await report(branches[0].id, { view: "year", date: anchor, search: first.customerName });
    assert.ok(matched.appointments.total > 0, "Customer contact search should find actual bookings.");
  }
  console.log(`Reports passed: 4 aggregate periods, ${checked} branch/period combinations, chart reconciliation, empty periods, pagination and literal/contact search. Database unchanged.`);
} finally {
  await sequelize.close();
}
