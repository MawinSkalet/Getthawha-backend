import { beforeEach, describe, expect, it, mock } from "bun:test";

const records = new Map();
let nextId = 1;

const Package = {
  findAll: async ({ where } = {}) =>
    [...records.values()].filter(
      (record) => where?.deletedAt !== null || record.deletedAt === null
    ),
  findByPk: async (id) => records.get(id) ?? null,
  create: async (values) => {
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
});
