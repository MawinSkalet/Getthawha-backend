import { describe, expect, it } from "bun:test";
import { up as addBookingMetadata } from "../migrations/202610050002_booking_customer_metadata.js";
import { up as addPackageCategory } from "../migrations/202610050003_package_category.js";

function makeQueryInterface(tables) {
  const additions = [];

  return {
    additions,
    async describeTable(tableName) {
      if (!tables[tableName]) throw new Error(`Unknown test table ${tableName}`);
      return { ...tables[tableName] };
    },
    async addColumn(tableName, columnName, definition) {
      tables[tableName][columnName] = definition;
      additions.push(`${tableName}.${columnName}`);
    },
  };
}

describe("schema migrations", () => {
  it("adds only missing booking columns and is safe to rerun", async () => {
    const tables = { bookings: { id: { type: "UUID" }, customerName: { type: "STRING" } } };
    const queryInterface = makeQueryInterface(tables);

    await addBookingMetadata({ queryInterface });
    await addBookingMetadata({ queryInterface });

    expect(queryInterface.additions).toEqual([
      "bookings.customerEmail",
      "bookings.customerPhone",
      "bookings.numberOfGuests",
      "bookings.source",
    ]);
  });

  it("adds package category only when it is missing", async () => {
    const tables = { packages: { id: { type: "UUID" } } };
    const queryInterface = makeQueryInterface(tables);

    await addPackageCategory({ queryInterface });
    await addPackageCategory({ queryInterface });

    expect(queryInterface.additions).toEqual(["packages.category"]);
  });
});
