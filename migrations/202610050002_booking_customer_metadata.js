import { DataTypes } from "sequelize";

const columns = {
  customerEmail: { type: DataTypes.STRING, allowNull: true },
  customerName: { type: DataTypes.STRING, allowNull: true },
  customerPhone: { type: DataTypes.STRING, allowNull: true },
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
};

export async function up({ queryInterface }) {
  const existingColumns = await queryInterface.describeTable("bookings");

  for (const [columnName, definition] of Object.entries(columns)) {
    if (!existingColumns[columnName]) {
      await queryInterface.addColumn("bookings", columnName, definition);
    }
  }
}
