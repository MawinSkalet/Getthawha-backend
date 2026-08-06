import {
  User,
  Booking,
  Package,
  Voucher,
  Branch,
  UserStaff,
} from "../models/index";
import {
  sendEmailNotification,
  sendUserNotification,
} from "../utils/sendNotifications";
async function getAllBooking(req, res) {
  try {
    const { page = 1 } = req.query;
    // Fetch all bookings from the database
    const bookings = await Booking.findAll({
      attributes: ["id", "date", "totalPrice", "status"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "displayName", "pictureUrl"],
        },
        { model: Branch, as: "branch", attributes: ["id", "name"] },
        { model: Package, as: "package", attributes: ["id", "title"] },
        {
          model: Voucher,
          as: "voucher",
          attributes: ["id", "code", "discount"],
        },
      ],
      limit: 10, // Assuming you want to paginate results
      offset: (page - 1) * 10, // Assuming 10 bookings per page
      //order by latest created date
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching bookings",
    });
  }
}

async function createBooking(req, res) {
  try {
    const { userId, branchId, packageId, voucherId, date } = req.body;
    // Validate input
    if (!userId || !branchId || !packageId || !date) {
      return res.status(400).json({
        status: "error",
        message: "Invalid booking data provided",
      });
    }
    const packageInfo = await Package.findByPk(packageId, {
      attributes: ["id", "price", "title"],
    });
    if (!packageInfo) {
      return res.status(404).json({
        status: "error",
        message: "Package not found",
      });
    }
    // Calculate total price based on package price and voucher discount
    let totalPrice = packageInfo.price;
    if (voucherId) {
      const voucher = await Voucher.findByPk(voucherId, {
        attributes: ["discount"],
      });
      if (voucher) {
        totalPrice -= voucher.discount; // Assuming discount is a percentage
      }
    }
    // Create a new Booking
    const newBooking = await Booking.create({
      userId,
      branchId,
      packageId,
      voucherId,
      date,
      totalPrice, // Assuming totalPrice is calculated later
    });

    // Send email notification to all admin emails
    const admins = await UserStaff.findAll({
      attributes: ["email"],
    });
    const adminEmails = admins.map((admin) => admin.email);
    const [branch, user] = await Promise.all([
      Branch.findByPk(branchId, { attributes: ["name"] }),
      User.findByPk(userId, { attributes: ["displayName"] }),
    ]);
    const branchName = branch ? branch.name : "N/A";
    const packageTitle = packageInfo ? packageInfo.title : "N/A";
    const displayName = user ? user.displayName : "N/A";
    const bookingCreatedMessage = [
      `Booking Created for ${displayName}`,
      `Booking ID: ${newBooking.id}`,
      `Date: ${newBooking.date}`,
      `Package: ${packageTitle}`,
      `Branch: ${branchName}`,
      `Total Price: $${newBooking.totalPrice}`,
      "",
      `จองสำเร็จสำหรับ ${displayName}`,
      `รหัสการจอง: ${newBooking.id}`,
      `วันที่: ${newBooking.date}`,
      `แพ็กเกจ: ${packageTitle}`,
      `สาขา: ${branchName}`,
      `ราคารวมทั้งหมด: $${newBooking.totalPrice}`,
    ].join("\n");

    const bookingCreatedEmailBody = [
      "Booking Created",
      `User: ${displayName}`,
      `Booking ID: ${newBooking.id}`,
      `Date: ${newBooking.date}`,
      `Package: ${packageTitle}`,
      `Branch: ${branchName}`,
      `Total Price: $${newBooking.totalPrice}`,
      `Status: ${newBooking.status}`,
      "",
      "สร้างการจองใหม่",
      `ผู้ใช้: ${displayName}`,
      `รหัสการจอง: ${newBooking.id}`,
      `วันที่: ${newBooking.date}`,
      `แพ็กเกจ: ${packageTitle}`,
      `สาขา: ${branchName}`,
      `ราคารวมทั้งหมด: $${newBooking.totalPrice}`,
      `สถานะ: ${newBooking.status}`,
    ].join("\n");

    await sendEmailNotification(
      "New Booking Created",
      bookingCreatedEmailBody,
      adminEmails
    );

    // Send user notification with UserId
    await sendUserNotification(userId, bookingCreatedMessage);

    return res.status(201).json(newBooking);
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while creating the booking",
    });
  }
}

async function updateBooking(req, res) {
  try {
    const { id } = req.params;
    const { userId, branchId, packageId, voucherId, date, status } = req.body;

    // Validate input
    if (!userId || !branchId || !packageId || !date || !status) {
      return res.status(400).json({
        status: "error",
        message: "Invalid booking data provided",
      });
    }

    // Find the booking to update
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Booking not found",
      });
    }

    // totalPrice calculation
    const packageInfo = await Package.findByPk(packageId, {
      attributes: ["id", "price", "title"],
    });
    if (!packageInfo) {
      return res.status(404).json({
        status: "error",
        message: "Package not found",
      });
    }
    let totalPrice = packageInfo.price;
    let discount = 0;
    let voucher = null;
    if (voucherId) {
      voucher = await Voucher.findByPk(voucherId, {
        attributes: ["discount"],
      });
      if (voucher) {
        discount = voucher.discount;
        totalPrice -= voucher.discount; // Assuming discount is a percentage
      }
    }
    const user = await User.findByPk(userId, {
      attributes: ["id", "displayName", "pictureUrl"],
    });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }
    const branch = await Branch.findByPk(branchId, {
      attributes: ["id", "name"],
    });
    if (!branch) {
      return res.status(404).json({
        status: "error",
        message: "Branch not found",
      });
    }
    // Update the booking
    booking.userId = userId;
    booking.branchId = branchId;
    booking.packageId = packageId;
    booking.voucherId = voucherId;
    booking.date = date;
    booking.status = status;

    await booking.save();
    const responseData = {
      id: booking.id,
      date: booking.date,
      totalPrice: totalPrice, // Assuming totalPrice is a number
      status: booking.status,
      user: {
        id: user.id,
        displayName: user.displayName,
        pictureUrl: user.pictureUrl, // Assuming pictureUrl is a string
      },
      branch: {
        id: branch.id,
        name: branch.name,
      },
      package: {
        id: packageInfo.id,
        title: packageInfo.title, // Assuming title is a string
      },

      voucher: voucher
        ? {
            id: voucher.id,
            code: voucher.code, // Assuming code is a string
            discount: discount, // Assuming discount is a number
          }
        : null,
    };

    const bookingUpdatedMessage = [
      `Booking Updated for ${user.displayName || "N/A"}`,
      `Booking ID: ${booking.id}`,
      `Status: ${status}`,
      `Date: ${booking.date}`,
      `Package: ${packageInfo.title}`,
      `Branch: ${branch.name}`,
      `Total Price: $${booking.totalPrice}`,
      "",
      `ข้อมูลการจองได้รับการอัปเดตสำหรับ ${user.displayName || "N/A"}`,
      `รหัสการจอง: ${booking.id}`,
      `สถานะ: ${status}`,
      `วันที่: ${booking.date}`,
      `แพ็กเกจ: ${packageInfo.title}`,
      `สาขา: ${branch.name}`,
      `ราคารวมทั้งหมด: $${booking.totalPrice}`,
    ].join("\n");

    // Send user notification with UserId updated and showing status
    await sendUserNotification(userId, bookingUpdatedMessage);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error updating booking:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating the booking",
    });
  }
}

async function deleteBooking(req, res) {
  try {
    const { id } = req.params;
    // Find the booking to delete
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Booking not found",
      });
    }
    // Delete the booking
    // await booking.destroy();

    //soft delete
    await booking.update({ status: "cancelled" });

    const [user, branch, packageInfo] = await Promise.all([
      User.findByPk(booking.userId, { attributes: ["displayName"] }),
      Branch.findByPk(booking.branchId, { attributes: ["name"] }),
      booking.packageId
        ? Package.findByPk(booking.packageId, { attributes: ["title"] })
        : Promise.resolve(null),
    ]);
    const displayName = user ? user.displayName : "N/A";
    const branchName = branch ? branch.name : "N/A";
    const packageTitle = packageInfo ? packageInfo.title : "N/A";
    const bookingCancelledMessage = [
      `Booking Cancelled for ${displayName}`,
      `Booking ID: ${booking.id}`,
      `Date: ${booking.date}`,
      `Package: ${packageTitle}`,
      `Branch: ${branchName}`,
      `Total Price: $${booking.totalPrice}`,
      `Status: ${booking.status}`,
      "",
      `การจองถูกยกเลิกสำหรับ ${displayName}`,
      `รหัสการจอง: ${booking.id}`,
      `วันที่: ${booking.date}`,
      `แพ็กเกจ: ${packageTitle}`,
      `สาขา: ${branchName}`,
      `ราคารวมทั้งหมด: $${booking.totalPrice}`,
      `สถานะ: ${booking.status}`,
    ].join("\n");

    // Send user notification with UserId
    await sendUserNotification(booking.userId, bookingCancelledMessage);

    return res.status(204).send(); // No content
  } catch (error) {
    console.error("Error deleting booking:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the booking",
    });
  }
}

export { getAllBooking, createBooking, updateBooking, deleteBooking };
