import { describe, expect, it, mock } from "bun:test";
import { Op } from "sequelize";

let revenueQuery;

mock.module("../models/index", () => ({
  User: { count: async () => 3 },
  Booking: {
    count: async () => 7,
    sum: async (_field, options) => {
      revenueQuery = options;
      return 1250;
    },
  },
  UserStaff: {},
  Branch: {},
  Package: {},
  Voucher: {},
  Review: {},
}));

const { getDasboard } = await import("../services/adminDashboard.services");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

describe("admin dashboard revenue", () => {
  it("counts confirmed and completed bookings in revenue", async () => {
    revenueQuery = null;
    const res = response();

    await getDasboard({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalRevenue).toBe(1250);
    expect(revenueQuery.where.status[Op.in]).toEqual(["confirmed", "completed"]);
  });
});
