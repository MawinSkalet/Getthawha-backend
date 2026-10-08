import { QueryTypes, Transaction } from "sequelize";
import { Branch, Booking } from "../models/index";
import { BOOKING_STATUSES, REPORT_TIMEZONE, buildReportBuckets, parseReportQuery } from "../utils/branchReport";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const scope = 'b."branchId" = :branchId AND b.date >= :start AND b.date < :end';
const revenue = `COALESCE(SUM(b."totalPrice") FILTER (WHERE b.status IN ('confirmed', 'completed')), 0)`;

// Both dashboard views use the same appointment interval, revenue rule and buckets.
async function performanceData(range, query, where) {
  const [summary] = await query(`SELECT COUNT(*) AS bookings, COUNT(DISTINCT b."userId") AS customers,
    ${revenue} AS revenue, ${BOOKING_STATUSES.map((status) => `COUNT(*) FILTER (WHERE b.status = '${status}') AS ${status}`).join(", ")}
    FROM bookings b WHERE ${where}`);
  const dailyTotals = await query(`SELECT to_char(b.date AT TIME ZONE 'Asia/Bangkok', '${range.view === "day" ? "YYYY-MM-DD HH24:00" : "YYYY-MM-DD"}') AS key,
    COUNT(*) AS bookings, ${revenue} AS revenue FROM bookings b WHERE ${where} GROUP BY 1 ORDER BY 1`);
  return {
    period: { view: range.view, date: range.date, start: range.start, end: range.end, timezone: REPORT_TIMEZONE },
    statistics: { bookings: Number(summary.bookings), revenue: Number(summary.revenue), customers: Number(summary.customers), pending: Number(summary.pending) },
    statusCounts: Object.fromEntries(BOOKING_STATUSES.map((status) => [status, Number(summary[status])])),
    chart: buildReportBuckets(range, dailyTotals),
  };
}

export async function getDashboardPerformance(req, res) {
  let range;
  try { range = parseReportQuery({ view: req.query.view, date: req.query.date }); }
  catch (error) { return res.status(400).json({ message: error.message }); }
  try {
    const data = await Booking.sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true }, async (transaction) => {
      const query = (sql) => Booking.sequelize.query(sql, { type: QueryTypes.SELECT, replacements: { start: range.startUtc, end: range.endUtc }, transaction });
      return performanceData(range, query, 'b.date >= :start AND b.date < :end');
    });
    res.set("Cache-Control", "no-store");
    return res.json({ data });
  } catch (error) {
    console.error("Dashboard performance query failed:", error.name);
    return res.status(500).json({ message: "Could not load dashboard performance. Please try again." });
  }
}

export async function getBranchReport(req, res) {
  if (!UUID.test(req.params.branchId)) return res.status(400).json({ message: "Invalid branch ID" });
  let range;
  try { range = parseReportQuery(req.query); }
  catch (error) { return res.status(400).json({ message: error.message }); }

  try {
    const data = await Booking.sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true }, async (transaction) => {
      const branch = await Branch.findByPk(req.params.branchId, {
        attributes: ["id", "name", "address", "phone", "pictureUrl", "isActive", "deletedAt"], raw: true, transaction,
      });
      if (!branch) return null;
      const branches = await Branch.findAll({ where: { deletedAt: null }, attributes: ["id", "name"], order: [["name", "ASC"]], raw: true, transaction });
      if (!branches.some((item) => item.id === branch.id)) branches.push({ id: branch.id, name: branch.name });
      const replacements = { branchId: branch.id, start: range.startUtc, end: range.endUtc };
      const query = (sql, extra = {}) => Booking.sequelize.query(sql, { type: QueryTypes.SELECT, replacements: { ...replacements, ...extra }, transaction });
      const performance = await performanceData(range, query, scope);
      const services = await query(`SELECT b."packageId" AS id, COALESCE(p.title, 'Unavailable service') AS title, p.duration,
        COUNT(*) AS bookings, ${revenue} AS revenue FROM bookings b LEFT JOIN packages p ON p.id = b."packageId"
        WHERE ${scope} GROUP BY b."packageId", p.title, p.duration ORDER BY COUNT(*) DESC, title ASC LIMIT 5`);
      // Search is literal, case-insensitive text. Wildcards supplied by the user are escaped.
      const search = `%${range.search.replace(/[\\%_]/g, "\\$&")}%`;
      const filter = `${scope}${range.status === "all" ? "" : " AND b.status = :status"}${!range.search ? "" : ` AND (COALESCE(NULLIF(b.\"customerName\", ''), u.\"displayName\", '') ILIKE :search OR COALESCE(NULLIF(b.\"customerPhone\", ''), u.phone, '') ILIKE :search OR COALESCE(p.title, '') ILIKE :search)`}`;
      const joins = 'LEFT JOIN users u ON u.id = b."userId" LEFT JOIN packages p ON p.id = b."packageId"';
      const [count] = await query(`SELECT COUNT(*) AS total FROM bookings b ${joins} WHERE ${filter}`, { status: range.status, search });
      const total = Number(count.total), pages = Math.max(1, Math.ceil(total / range.pageSize)), page = Math.min(range.page, pages);
      const bookings = await query(`SELECT b.id, b.date, b.status, b."totalPrice", b."numberOfGuests", b.source,
        COALESCE(NULLIF(b."customerName", ''), u."displayName", 'Customer') AS "customerName",
        COALESCE(NULLIF(b."customerPhone", ''), u.phone) AS "customerPhone",
        COALESCE(NULLIF(b."customerEmail", ''), u.email) AS "customerEmail",
        COALESCE(p.title, 'Unavailable service') AS "serviceTitle", p.duration
        FROM bookings b ${joins} WHERE ${filter} ORDER BY b.date ASC, b.id ASC LIMIT :limit OFFSET :offset`,
      { status: range.status, search, limit: range.pageSize, offset: (page - 1) * range.pageSize });
      return {
        branch, branches,
        ...performance,
        services: services.map((item) => ({ ...item, bookings: Number(item.bookings), revenue: Number(item.revenue) })),
        appointments: { rows: bookings.map((item) => ({ ...item, totalPrice: Number(item.totalPrice) })), total, page, pageSize: range.pageSize, pages },
      };
    });
    if (!data) return res.status(404).json({ message: "Branch not found" });
    res.set("Cache-Control", "no-store");
    return res.json({ data });
  } catch (error) {
    console.error("Branch report query failed:", error.name);
    return res.status(500).json({ message: "Could not load this branch report. Please try again." });
  }
}
