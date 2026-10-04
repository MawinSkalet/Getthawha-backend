import { describe, expect, it, mock } from "bun:test";
import { Op } from "sequelize";

let findAllOptions;
let findAllCalls = 0;
const bookings = [{ id: "booking-1" }, { id: "booking-2" }];

mock.module("../models/index", () => ({
  User: {},
  UserStaff: {},
  Booking: {
    findAll: async (options) => {
      findAllCalls += 1;
      findAllOptions = options;
      return bookings;
    },
  },
  Package: {},
  Voucher: {},
  Branch: {},
  Review: {},
}));

const { getBookingsByMonth } = await import("../services/calendar.services");

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

describe("admin calendar month appointments", () => {
  it("returns bookings for the selected month in date order", async () => {
    findAllCalls = 0;
    findAllOptions = null;
    const res = response();

    await getBookingsByMonth({ params: { year: "2026", month: "2" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "success", data: bookings });
    expect(findAllCalls).toBe(1);
    expect(findAllOptions.order).toEqual([["date", "ASC"]]);
    expect(findAllOptions.where.date[Op.gte]).toEqual(new Date("2026-01-31T17:00:00.000Z"));
    expect(findAllOptions.where.date[Op.lt]).toEqual(new Date("2026-02-28T17:00:00.000Z"));
  });

  it("rejects an invalid month without querying bookings", async () => {
    findAllCalls = 0;
    const res = response();

    await getBookingsByMonth({ params: { year: "2026", month: "13" } }, res);

    expect(res.statusCode).toBe(400);
    expect(findAllCalls).toBe(0);
  });
});
