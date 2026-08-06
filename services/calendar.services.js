import { User, Booking, Package, Voucher, Branch } from "../models/index";
import { Op } from "sequelize";
import moment from "moment-timezone";

async function getDailyBookingStatusByMonth(req, res) {
  try {
    const { year, month } = req.params;

    // Start and end of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // end of the last day

    // Get bookings within the month, grouped by date only
    const bookings = await Booking.findAll({
      attributes: [
        [Booking.sequelize.fn("DATE", Booking.sequelize.col("date")), "date"],
      ],
      where: {
        date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      group: [Booking.sequelize.fn("DATE", Booking.sequelize.col("date"))],
      raw: true,
    });

    // Convert booking dates to a Set for faster lookup
    const bookedDateSet = new Set(
      bookings.map((b) => {
        const dateObj = new Date(b.date);
        // Get local date string in YYYY-MM-DD (e.g., Thailand time)
        return (
          dateObj.getFullYear() +
          "-" +
          String(dateObj.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(dateObj.getDate()).padStart(2, "0")
        );
      })
    );

    const dailyBookingStatus = {};
    for (let day = 1; day <= endDate.getDate(); day++) {
      const date = new Date(year, month - 1, day);
      const dateKey =
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0");

      dailyBookingStatus[day] = bookedDateSet.has(dateKey);
    }

    return res.status(200).json({
      status: "success",
      data: dailyBookingStatus,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching daily booking status by month",
    });
  }
}

async function getBookingByDate(req, res) {
  try {
    const { day, month, year } = req.params;

    // Use a fixed business timezone to avoid server-timezone drift
    // If you need to make this dynamic, read from env (e.g., process.env.APP_TZ)
    const TZ = "Asia/Bangkok"; // Thailand time (UTC+07)
    const y = parseInt(year, 10);
    const m = parseInt(month, 10) - 1; // moment months are 0-based
    const d = parseInt(day, 10);

    // Half-open interval: [startOfDay, nextDayStart)
    const startOfDay = moment.tz([y, m, d, 0, 0, 0, 0], TZ).toDate();
    const nextDayStart = moment.tz([y, m, d, 0, 0, 0, 0], TZ).add(1, "day").toDate();

    const bookings = await Booking.findAll({
      where: {
        date: {
          [Op.gte]: startOfDay,
          [Op.lt]: nextDayStart,
        },
      },
      include: [
        {
          model: User,
          attributes: ["id", "displayName", "pictureUrl"],
          as: "user",
        },
        { model: Package, attributes: ["id", "title"], as: "package" },
        {
          model: Voucher,
          attributes: ["id", "code", "discount"],
          as: "voucher",
        },
        { model: Branch, attributes: ["id", "name"], as: "branch" },
      ],
      attributes: {
        exclude: [
          "userId",
          "branchId",
          "packageId",
          "voucherId",
          "createdAt",
          "updatedAt",
        ],
      },
      order: [["date", "ASC"]],
    });

    return res.status(200).json({
      status: "success",
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching bookings by date",
    });
  }
}

export { getDailyBookingStatusByMonth, getBookingByDate };
