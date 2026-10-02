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
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { isEmail: true },
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  numberOfGuests: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
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
