import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { QueryTypes } from "sequelize";
import "../models/index.js";
import { sequelize } from "../config/database.js";

const migrationsDirectory = path.resolve(process.cwd(), "migrations");

export async function runMigrations({ db = sequelize, directory = migrationsDirectory } = {}) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS "schema_migrations" (
      "name" VARCHAR(255) PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const appliedRows = await db.query('SELECT "name" FROM "schema_migrations"', {
    type: QueryTypes.SELECT,
  });
  const applied = new Set(appliedRows.map((row) => row.name));
  const migrationFiles = (await readdir(directory))
    .filter((file) => /^\d{12}_[a-z0-9_]+\.js$/.test(file))
    .sort();

  for (const file of migrationFiles) {
    if (applied.has(file)) continue;

    const migrationUrl = pathToFileURL(path.join(directory, file)).href;
    const migration = await import(migrationUrl);
    if (typeof migration.up !== "function") {
      throw new Error(`Migration ${file} must export an up function.`);
    }

    await migration.up({
      sequelize: db,
      queryInterface: db.getQueryInterface(),
    });
    await db.query('INSERT INTO "schema_migrations" ("name") VALUES (:name)', {
      replacements: { name: file },
    });
    console.log(`Applied database migration ${file}`);
  }
}

if (import.meta.main) {
  try {
    await sequelize.authenticate();
    await runMigrations();
  } catch (error) {
    console.error("Database migration failed.", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
