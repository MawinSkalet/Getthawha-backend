import { DataTypes } from "sequelize";
import { sequelize } from "../config/database";

const Booking = sequelize.define("bookings", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  packageId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  voucherId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  // Keep the address used for this specific booking. A user may update their
  // profile later, but the notification record must remain accurate.
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  // The name of the person who booked it (or guest name)
  customerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Number of persons / guests
  numberOfGuests: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  // The channel the customer used to begin their booking. `facebook` is
  // accepted now so the future Messenger link can use the same API flow.
  source: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "website",
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },

  totalPrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },

  status: {
    type: DataTypes.ENUM("pending", "confirmed", "cancelled", "completed"),
    defaultValue: "pending",
  },
});
export default Booking;
