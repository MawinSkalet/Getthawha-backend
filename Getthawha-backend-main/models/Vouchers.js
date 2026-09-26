import { DataTypes } from "sequelize";
import { sequelize } from "../config/database";

const Voucher = sequelize.define("vouchers", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  isExpired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

export default Voucher;
