import { beforeEach, describe, expect, it, mock } from "bun:test";

let userExists = true;
let shouldFail = false;
let lastQuery;
const savedBookings = [
  { id: "booking-new", userId: "user-1", status: "confirmed" },
  { id: "booking-old", userId: "user-1", status: "completed" },
];

const User = {
  findByPk: async (id, query) => {
    lastQuery = query;
    if (shouldFail) throw new Error("database unavailable");
    if (!userExists || id !== "user-1") return null;
    return {
      id,
      displayName: "Customer",
      bookings: savedBookings,
    };
  },
};

mock.module("../models/index", () => ({
  User,
  Booking: {},
  Package: {},
  Branch: {},
  Voucher: {},
}));

const { getUserById } = await import("../services/user.services");

function response() {
  return {
    statusCode: 200,
    body: undefined,
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

beforeEach(() => {
  userExists = true;
  shouldFail = false;
  lastQuery = undefined;
});

describe("admin user booking history", () => {
  it("returns the user and every booking with the detail associations", async () => {
    const res = response();
    await getUserById({ params: { id: "user-1" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe("user-1");
    expect(res.body.bookings.map(({ id }) => id)).toEqual([
      "booking-new",
      "booking-old",
    ]);

    const bookings = lastQuery.include.find(({ as }) => as === "bookings");
    expect(bookings.attributes).toContain("customerPhone");
    expect(bookings.include.map(({ as }) => as)).toEqual([
      "package",
      "branch",
      "voucher",
    ]);
    expect(bookings.include.find(({ as }) => as === "package").attributes).toContain(
      "duration"
    );
  });

  it("returns 404 when the user does not exist", async () => {
    userExists = false;
    const res = response();
    await getUserById({ params: { id: "missing-user" } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  it("returns a server error when the detail query fails", async () => {
    shouldFail = true;
    const res = response();
    await getUserById({ params: { id: "user-1" } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("An error occurred while fetching the user");
  });
});
