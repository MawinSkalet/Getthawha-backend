import { DataTypes } from "sequelize";
import { sequelize } from "../config/database";

const User = sequelize.define("users", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  pictureUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

export default User;
