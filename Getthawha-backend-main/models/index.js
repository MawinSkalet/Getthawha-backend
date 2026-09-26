import UserStaff from "./UserStaff";
import Booking from "./Booking";
import Branch from "./Branch";
import Package from "./Package";
import User from "./User";
import Voucher from "./Vouchers";
import Review from "./Review";

Branch.hasMany(Booking, {
  foreignKey: "branchId",
  as: "bookings",
});

Booking.belongsTo(Branch, {
  foreignKey: "branchId",
  as: "branch",
});

User.hasMany(Booking, {
  foreignKey: "userId",
  as: "bookings",
});

Booking.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Package.hasMany(Booking, {
  foreignKey: "packageId",
  as: "bookings",
});

Booking.belongsTo(Package, {
  foreignKey: "packageId",
  as: "package",
});

Voucher.hasMany(Booking, {
  foreignKey: "voucherId",
  as: "bookings",
});

Booking.belongsTo(Voucher, {
  foreignKey: "voucherId",
  as: "voucher",
});

Review.belongsTo(User, { foreignKey: "userId", as: "user" });
Review.belongsTo(Branch, { foreignKey: "branchId", as: "branch" });

Branch.hasMany(Review, { foreignKey: "branchId", as: "reviews" });
User.hasMany(Review, { foreignKey: "userId", as: "reviews" });



// Export models
export { UserStaff, Booking, Branch, Package, User, Voucher, Review };
