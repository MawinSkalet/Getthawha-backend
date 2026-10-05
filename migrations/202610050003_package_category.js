import { DataTypes } from "sequelize";

export async function up({ queryInterface }) {
  const existingColumns = await queryInterface.describeTable("packages");

  if (!existingColumns.category) {
    await queryInterface.addColumn("packages", "category", {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
}
