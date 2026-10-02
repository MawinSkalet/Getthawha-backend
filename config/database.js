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
    // `sync()` creates tables but does not add columns to an existing table.
    // Add the notification fields safely for installations created before
    // customer-email notifications existed.
    const queryInterface = sequelize.getQueryInterface();
    const bookingColumns = await queryInterface.describeTable("bookings");

    if (!bookingColumns.customerEmail) {
      await queryInterface.addColumn("bookings", "customerEmail", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!bookingColumns.source) {
      await queryInterface.addColumn("bookings", "source", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "website",
      });
    }

    if (!bookingColumns.customerName) {
      await queryInterface.addColumn("bookings", "customerName", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!bookingColumns.numberOfGuests) {
      await queryInterface.addColumn("bookings", "numberOfGuests", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    }

    console.log("Connection synced successfully");
  } catch (error) {
    console.error("Unable to sync to the database:", error);
  }
}

export { sequelize, connect, sync };
