import { DataTypes } from "sequelize";

const columns = {
  email: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.STRING(500), allowNull: true },
};

export async function up({ queryInterface }) {
  const existingColumns = await queryInterface.describeTable("users");

  for (const [columnName, definition] of Object.entries(columns)) {
    if (!existingColumns[columnName]) {
      await queryInterface.addColumn("users", columnName, definition);
    }
  }
}
