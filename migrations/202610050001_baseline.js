// This one-time baseline supports both empty databases and existing databases
// that were previously bootstrapped with Sequelize. Do not use alter/force here;
// future schema changes belong in new, reviewed migration files.
export async function up({ sequelize }) {
  await sequelize.sync();
}
