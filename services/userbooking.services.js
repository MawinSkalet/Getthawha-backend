import {
  User,
  Booking,
  Package,
  Voucher,
  Branch,
  UserStaff,
} from "../models/index";
import {
  sendUserNotification,
  sendEmailNotification,
} from "../utils/sendNotifications";
import { sendBookingCreatedNotifications } from "./bookingNotification.services";

const BOOKING_SOURCES = new Set(["website", "facebook", "line", "admin"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function configuredOwnerEmails() {
  return (process.env.OWNER_NOTIFICATION_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

async function getAllBooking(req, res) {
  try {
    const { page = 1 } = req.query;
    const bookings = await Booking.findAll({
      attributes: ["id", "date", "totalPrice", "status", "customerEmail", "customerName", "numberOfGuests"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "displayName", "pictureUrl"],
          where: { id: req.user.id },
        },
        { model: Branch, as: "branch", attributes: ["id", "name"] },
        { model: Package, as: "package", attributes: ["id", "title"] },
        {
          model: Voucher,
          as: "voucher",
          attributes: ["id", "code", "discount"],
        },
      ],
      limit: 10,
      offset: (page - 1) * 10,
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
    const { branchId, packageId, voucherId, date, customerEmail, customerName, numberOfGuests = 1, source = "website" } = req.body;
    const normalizedCustomerEmail = String(customerEmail || "").trim().toLowerCase();
    const normalizedSource = String(source || "website").trim().toLowerCase();
    const parsedGuests = Math.max(1, parseInt(numberOfGuests, 10) || 1);
    const resolvedCustomerName = customerName && String(customerName).trim() ? String(customerName).trim() : (req.user.displayName || "Customer");

    if (!branchId || !packageId || !date || !normalizedCustomerEmail) {
      return res.status(400).json({
        status: "error",
        message: "Branch, package, date, and customer email are required",
      });
    }
    if (!EMAIL_PATTERN.test(normalizedCustomerEmail)) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a valid customer email address",
      });
    }
    if (!BOOKING_SOURCES.has(normalizedSource)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid booking source",
      });
    }
    const packageInfo = await Package.findByPk(packageId, {
      attributes: ["price", "title"],
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
        totalPrice -= voucher.discount; // Assuming discount is a percentage
      }
    }
    const newBooking = await Booking.create({
      userId: req.user.id,
      branchId,
      packageId,
      voucherId,
      date,
      totalPrice,
      customerEmail: normalizedCustomerEmail,
      customerName: resolvedCustomerName,
      numberOfGuests: parsedGuests,
      source: normalizedSource,
    });

    //get branch name
    const branch = await Branch.findByPk(branchId, {
      attributes: ["name"],
    });

    //get package title
    const branchName = branch ? branch.name : "N/A";
    const packageTitle = packageInfo ? packageInfo.title : "N/A";
    const displayName = resolvedCustomerName;
    const bookingCreatedMessage = [
      `Booking Created for ${displayName} (${parsedGuests} person${parsedGuests > 1 ? "s" : ""})`,
      `Date: ${newBooking.date}`,
      `Package: ${packageTitle}`,
      `Branch: ${branchName}`,
      `Total Price: $${newBooking.totalPrice}`,
      "",
      `จองสำเร็จสำหรับ ${displayName} (${parsedGuests} ท่าน)`,
      `วันที่: ${newBooking.date}`,
      `แพ็กเกจ: ${packageTitle}`,
      `สาขา: ${branchName}`,
      `ราคารวมทั้งหมด: $${newBooking.totalPrice}`,
    ].join("\n");

    await sendUserNotification(req.user.id, bookingCreatedMessage);

    // Owner addresses may be configured explicitly. Existing staff addresses
    // remain a safe fallback until that environment value is set.
    const admins = await UserStaff.findAll({
      attributes: ["email"],
    });
    const ownerEmails = configuredOwnerEmails();
    const notificationRecipients =
      ownerEmails.length > 0 ? ownerEmails : admins.map((admin) => admin.email);

    try {
      await sendBookingCreatedNotifications({
        booking: newBooking,
        customerName: displayName,
        branchName,
        packageTitle,
        ownerEmails: notificationRecipients,
      });
    } catch (notificationError) {
      // A mail outage must not turn a successful booking into an error.
      console.error("Booking notification failed:", notificationError);
    }

    return res.status(201).json({
      status: "success",
      message: "Booking created successfully",
      booking: {
        id: newBooking.id,
        userId: newBooking.userId,
        branchId: newBooking.branchId,
        packageId: newBooking.packageId,
        voucherId: newBooking.voucherId,
        customerEmail: newBooking.customerEmail,
        customerName: newBooking.customerName,
        numberOfGuests: newBooking.numberOfGuests,
        source: newBooking.source,
        date: newBooking.date,
        totalPrice: newBooking.totalPrice,
        status: newBooking.status,
      },
    });
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
    const { branchId, packageId, voucherId, date, status } = req.body;
    if (!branchId || !packageId || !date || !status) {
      return res.status(400).json({
        status: "error",
        message: "Invalid booking data provided",
      });
    }
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Booking not found",
      });
    }

    //user can only chang status to 'cancelled' if the current status is 'pending' or 'confirmed'
    if (status === "cancelled") {
      if (booking.status === "completed") {
        return res.status(400).json({
          status: "error",
          message: "You cannot cancel a completed booking",
        });
      }
      if (booking.status === "cancelled") {
        return res.status(400).json({
          status: "error",
          message: "Booking is already cancelled",
        });
      }
    }

    //user cant change status to confirmed or completed
    if (status === "confirmed" || status === "completed") {
      return res.status(400).json({
        status: "error",
        message:
          "You are not allowed to change status to confirmed or completed",
      });
    }

    //check if user is the owner of the booking
    if (booking.userId !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to update this booking",
      });
    }
    const packageInfo = await Package.findByPk(packageId, {
      attributes: ["price", "title"],
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
        totalPrice -= voucher.discount; // Assuming discount is a percentage
      }
    }
    await booking.update({
      branchId,
      packageId,
      voucherId,
      date,
      totalPrice,
    });

    // Send user notification with UserId updated and showing status
    const updatedBranch = await Branch.findByPk(booking.branchId, {
      attributes: ["name"],
    });
    const branchName = updatedBranch ? updatedBranch.name : "N/A";
    const packageTitle = packageInfo ? packageInfo.title : "N/A";
    const bookingUpdatedMessage = [
      `Booking Updated for ${req.user.displayName || "N/A"}`,
      `Booking ID: ${booking.id}`,
      `Status: ${status}`,
      `Date: ${booking.date}`,
      `Package: ${packageTitle}`,
      `Branch: ${branchName}`,
      `Total Price: $${booking.totalPrice}`,
      "",
      `ข้อมูลการจองได้รับการอัปเดตสำหรับ ${req.user.displayName || "N/A"}`,
      `รหัสการจอง: ${booking.id}`,
      `สถานะ: ${status}`,
      `วันที่: ${booking.date}`,
      `แพ็กเกจ: ${packageTitle}`,
      `สาขา: ${branchName}`,
      `ราคารวมทั้งหมด: $${booking.totalPrice}`,
    ].join("\n");

    await sendUserNotification(req.user.id, bookingUpdatedMessage);

    const bookingUpdatedEmailBody = [
      "Booking Updated",
      `User: ${req.user.displayName || "N/A"}`,
      `Booking ID: ${booking.id}`,
      `Status: ${status}`,
      `Date: ${booking.date}`,
      `Package: ${packageTitle}`,
      `Branch: ${branchName}`,
      `Total Price: $${booking.totalPrice}`,
      "",
      "อัปเดตการจอง",
      `ผู้ใช้: ${req.user.displayName || "N/A"}`,
      `รหัสการจอง: ${booking.id}`,
      `สถานะ: ${status}`,
      `วันที่: ${booking.date}`,
      `แพ็กเกจ: ${packageTitle}`,
      `สาขา: ${branchName}`,
      `ราคารวมทั้งหมด: $${booking.totalPrice}`,
    ].join("\n");

    // Send email notification to owner / admin emails
    const admins = await UserStaff.findAll({
      attributes: ["email"],
    });
    const ownerEmails = configuredOwnerEmails();
    const adminEmails =
      ownerEmails.length > 0 ? ownerEmails : admins.map((admin) => admin.email);
    await sendEmailNotification(
      "Booking Updated",
      bookingUpdatedEmailBody,
      adminEmails
    );

    return res.status(200).json({
      status: "success",
      message: "Booking updated successfully",
      booking: {
        id: booking.id,
        userId: booking.userId,
        branchId: booking.branchId,
        packageId: booking.packageId,
        voucherId: booking.voucherId,
        date: booking.date,
        totalPrice: booking.totalPrice,
        status: booking.status,
      },
    });
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
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Booking not found",
      });
    }
    //check if user is the owner of the booking
    if (booking.userId !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to delete this booking",
      });
    }
    // await booking.destroy();

    //soft delete
    await booking.update({ status: "cancelled" });

    // Send user notification with UserId
    const [branch, packageInfo] = await Promise.all([
      Branch.findByPk(booking.branchId, { attributes: ["name"] }),
      Package.findByPk(booking.packageId, { attributes: ["title"] }),
    ]);
    const branchName = branch ? branch.name : "N/A";
    const packageTitle = packageInfo ? packageInfo.title : "N/A";
    const bookingCancelledMessage = [
      `Booking Cancelled for ${req.user.displayName || "N/A"}`,
      `Booking ID: ${booking.id}`,
      `Date: ${booking.date}`,
      `Package: ${packageTitle}`,
      `Branch: ${branchName}`,
      `Total Price: $${booking.totalPrice}`,
      `Status: ${booking.status}`,
      "",
      `การจองถูกยกเลิกสำหรับ ${req.user.displayName || "N/A"}`,
      `รหัสการจอง: ${booking.id}`,
      `วันที่: ${booking.date}`,
      `แพ็กเกจ: ${packageTitle}`,
      `สาขา: ${branchName}`,
      `ราคารวมทั้งหมด: $${booking.totalPrice}`,
      `สถานะ: ${booking.status}`,
    ].join("\n");

    await sendUserNotification(booking.userId, bookingCancelledMessage);

    const bookingCancelledEmailBody = [
      "Booking Cancelled",
      `User: ${req.user.displayName || "N/A"}`,
      `Booking ID: ${booking.id}`,
      `Date: ${booking.date}`,
      `Package: ${packageTitle}`,
      `Branch: ${branchName}`,
      `Total Price: $${booking.totalPrice}`,
      `Status: ${booking.status}`,
      "",
      "ยกเลิกการจอง",
      `ผู้ใช้: ${req.user.displayName || "N/A"}`,
      `รหัสการจอง: ${booking.id}`,
      `วันที่: ${booking.date}`,
      `แพ็กเกจ: ${packageTitle}`,
      `สาขา: ${branchName}`,
      `ราคารวมทั้งหมด: $${booking.totalPrice}`,
      `สถานะ: ${booking.status}`,
    ].join("\n");

    // Send email notification to owner / admin emails
    const admins = await UserStaff.findAll({
      attributes: ["email"],
    });
    const ownerEmails = configuredOwnerEmails();
    const adminEmails =
      ownerEmails.length > 0 ? ownerEmails : admins.map((admin) => admin.email);
    await sendEmailNotification(
      "Booking Cancelled",
      bookingCancelledEmailBody,
      adminEmails
    );

    return res.status(200).json({
      status: "success",
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the booking",
    });
  }
}

export { getAllBooking, createBooking, updateBooking, deleteBooking };
