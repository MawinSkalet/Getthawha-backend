import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const sequelize = new Sequelize(
  process.env.DATABASE, // Database name
  process.env.USER_DB, // Username
  process.env.PASSWORD, // Password
  {
    host: process.env.HOST, // Connect to your local database otherwise use 61.7.143.204
    dialect: "postgres", // Tell sequelize to use Postgres
    logging: false, // Disable logging
    dialectOptions: {
      useUTC: false, // for reading from database
    },
    timezone: "+07:00", // for writing to database
  }
);
async function connect() {
  try {
    await sequelize.authenticate();
    console.log("Connection established successfully");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

async function sync() {
  try {
    await sequelize.sync();
    // sequelize.sync() creates missing tables, but does not add columns to
    // booking tables that already exist. Add the notification fields safely.
    const queryInterface = sequelize.getQueryInterface();
    const bookingColumns = await queryInterface.describeTable("bookings");

    const newColumns = {
      customerEmail: { type: Sequelize.STRING, allowNull: true },
      customerName: { type: Sequelize.STRING, allowNull: true },
      numberOfGuests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      source: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "website",
      },
    };

    for (const [columnName, definition] of Object.entries(newColumns)) {
      if (!bookingColumns[columnName]) {
        await queryInterface.addColumn("bookings", columnName, definition);
      }
    }

    const packageColumns = await queryInterface.describeTable("packages");
    if (!packageColumns.category) {
      await queryInterface.addColumn("packages", "category", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    console.log("Connection synced successfully");
  } catch (error) {
    console.error("Unable to sync to the database:", error);
  }
}

export { sequelize, connect, sync };
