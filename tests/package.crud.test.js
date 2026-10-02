import { beforeEach, describe, expect, it, mock } from "bun:test";

const records = new Map();
let nextId = 1;

const Package = {
  sequelize: {
    transaction: async () => ({
      commit: async () => {},
      rollback: async () => {},
    }),
  },
  findAll: async ({ where } = {}) =>
    [...records.values()].filter(
      (record) => where?.deletedAt !== null || record.deletedAt === null
    ),
  findByPk: async (id) => records.get(id) ?? null,
  create: async (values) => {
    if ([...records.values()].some((record) => record.title === values.title)) {
      const error = new Error("duplicate package title");
      error.name = "SequelizeUniqueConstraintError";
      throw error;
    }
    const record = {
      id: `package-${nextId++}`,
      isActive: true,
      deletedAt: null,
      ...values,
      update: async function (changes) {
        Object.assign(this, changes);
        return this;
      },
    };
    records.set(record.id, record);
    return record;
  },
};

mock.module("../models/index", () => ({ Package }));
const packageServices = await import("../services/package.services");

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

const validInput = (overrides = {}) => ({
  type: "service",
  title: "Thai massage",
  description: "Traditional Thai massage",
  price: 300,
  duration: 60,
  pictureUrl: null,
  note: null,
  ...overrides,
});

beforeEach(() => {
  records.clear();
  nextId = 1;
});

describe("admin service and promotion catalog CRUD", () => {
  it("creates services and promotions when an image is omitted", async () => {
    const serviceResponse = response();
    await packageServices.createPackage(
      { body: validInput({ pictureUrl: "" }) },
      serviceResponse
    );

    const promotionResponse = response();
    await packageServices.createPackage(
      {
        body: validInput({
          type: "promotion",
          title: "Seasonal offer",
          price: "799.00",
          duration: "90",
        }),
      },
      promotionResponse
    );

    expect(serviceResponse.statusCode).toBe(201);
    expect(serviceResponse.body).toMatchObject({
      type: "service",
      title: "Thai massage",
      pictureUrl: null,
    });
    expect(promotionResponse.statusCode).toBe(201);
    expect(promotionResponse.body).toMatchObject({
      type: "promotion",
      title: "Seasonal offer",
      price: 799,
      duration: 90,
    });
  });

  it("creates a complete menu item with multiple duration prices in one operation", async () => {
    const res = response();
    await packageServices.createPackageGroup(
      {
        body: {
          type: "service",
          category: "Thai Massage",
          title: "Thai massage",
          description: "Traditional Thai massage",
          pictureUrl: null,
          note: null,
          variants: [
            { duration: 60, price: 300 },
            { duration: 90, price: 450 },
            { duration: 120, price: 600 },
          ],
        },
      },
      res
    );

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveLength(3);
    expect(res.body.map(({ title, duration, price }) => [title, duration, price])).toEqual([
      ["Thai massage (60 mins)", 60, 300],
      ["Thai massage (90 mins)", 90, 450],
      ["Thai massage (120 mins)", 120, 600],
    ]);
    expect(res.body.every((variant) => variant.category === "Thai Massage")).toBe(true);
  });

  it("updates variants together, hides removed durations, and can hide the item from bookings", async () => {
    const create = response();
    await packageServices.createPackageGroup(
      {
        body: {
          type: "service",
          category: "Foot Massage",
          title: "Foot massage",
          description: "Foot treatment",
          variants: [
            { duration: 60, price: 300 },
            { duration: 90, price: 450 },
            { duration: 120, price: 600 },
          ],
        },
      },
      create
    );

    const update = response();
    await packageServices.updatePackageGroup(
      {
        params: { id: create.body[0].id },
        body: {
          type: "service",
          category: "Foot Massage",
          title: "Foot massage",
          description: "Updated foot treatment",
          isActive: false,
          variants: [
            { duration: 60, price: 330 },
            { duration: 120, price: 650 },
          ],
        },
      },
      update
    );

    expect(update.statusCode).toBe(200);
    expect(update.body).toHaveLength(2);
    expect(update.body.every((variant) => !variant.isActive)).toBe(true);
    expect([...records.values()].find((record) => record.duration === 90).deletedAt).toBeInstanceOf(Date);
    const list = response();
    await packageServices.getAllPackage({}, list);
    expect(list.body).toHaveLength(2);
    expect(list.body.every((variant) => !variant.isActive)).toBe(true);
  });

  it("rejects duplicate service groups with a clear conflict response", async () => {
    const first = response();
    const input = {
      type: "promotion",
      category: "The Best Massage",
      title: "Office syndrome massage",
      description: "Office treatment",
      variants: [{ duration: 90, price: 799 }],
    };
    await packageServices.createPackageGroup({ body: input }, first);
    const duplicate = response();
    await packageServices.createPackageGroup({ body: input }, duplicate);

    expect(first.statusCode).toBe(201);
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.body.message).toContain("already exists");
  });

  it("rejects invalid types, blank text, and non-positive values", async () => {
    for (const input of [
      validInput({ type: "voucher" }),
      validInput({ title: "  " }),
      validInput({ description: "" }),
      validInput({ price: 0 }),
      validInput({ duration: 60.5 }),
    ]) {
      const res = response();
      await packageServices.createPackage({ body: input }, res);
      expect(res.statusCode).toBe(400);
    }
    expect(records.size).toBe(0);
  });

  it("lists active catalog records and updates all editable fields", async () => {
    const created = await Package.create(validInput());
    await Package.create(validInput({ type: "promotion", title: "Offer" }));
    const deleted = await Package.create(validInput({ title: "Old item" }));
    deleted.deletedAt = new Date();

    const list = response();
    await packageServices.getAllPackage({}, list);
    expect(list.statusCode).toBe(200);
    expect(list.body.map(({ title }) => title)).toEqual([
      "Thai massage",
      "Offer",
    ]);

    const updated = response();
    await packageServices.updatePackage(
      {
        params: { id: created.id },
        body: validInput({
          type: "promotion",
          title: "Updated massage offer",
          description: "Revised details",
          price: 450,
          duration: 90,
          pictureUrl: "https://example.com/service.webp",
          note: "By appointment",
        }),
      },
      updated
    );
    expect(updated.statusCode).toBe(200);
    expect(updated.body).toMatchObject({
      type: "promotion",
      title: "Updated massage offer",
      description: "Revised details",
      price: 450,
      duration: 90,
      pictureUrl: "https://example.com/service.webp",
      note: "By appointment",
    });
  });

  it("removes a service or promotion from the catalog while preserving its row", async () => {
    const created = await Package.create(validInput({ type: "promotion" }));
    const deleted = response();
    await packageServices.deletePackage({ params: { id: created.id } }, deleted);

    expect(deleted.statusCode).toBe(204);
    expect(created.isActive).toBe(false);
    expect(created.deletedAt).toBeInstanceOf(Date);

    const list = response();
    await packageServices.getAllPackage({}, list);
    expect(list.body).toHaveLength(0);

    const updateDeleted = response();
    await packageServices.updatePackage(
      { params: { id: created.id }, body: validInput() },
      updateDeleted
    );
    expect(updateDeleted.statusCode).toBe(404);
  });

  it("removes every duration in a menu group while keeping booking records", async () => {
    const created = response();
    await packageServices.createPackageGroup(
      {
        body: {
          type: "promotion",
          category: "The Best Massage",
          title: "Office syndrome",
          description: "A promotion",
          variants: [
            { duration: 90, price: 799 },
            { duration: 120, price: 1000 },
          ],
        },
      },
      created
    );
    const deleted = response();
    await packageServices.deletePackageGroup(
      { params: { id: created.body[0].id } },
      deleted
    );

    expect(deleted.statusCode).toBe(204);
    expect([...records.values()].every((record) => record.isActive === false)).toBe(true);
    const list = response();
    await packageServices.getAllPackage({}, list);
    expect(list.body).toHaveLength(0);
  });
});
