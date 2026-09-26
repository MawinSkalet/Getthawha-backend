import { User, Booking, Branch } from "../models/index";
import { Op } from "sequelize";
import moment from "moment-timezone";

async function getDasboard(req, res) {
  try {
    const totalUsers = await User.count();
    const totalBookings = await Booking.count();
    const totalRevenue = await Booking.sum("totalPrice", {
      where: { status: { [Op.eq]: "completed" } },
    });
    // Get today's bookings in business timezone using half-open interval
    const TZ = "Asia/Bangkok";
    const nowTz = moment.tz(TZ);
    const todayStart = nowTz.clone().startOf("day").toDate();
    const tomorrowStart = nowTz.clone().add(1, "day").startOf("day").toDate();
    const todayBookings = await Booking.count({
      where: {
        date: {
          [Op.gte]: todayStart,
          [Op.lt]: tomorrowStart,
        },
        status: { [Op.eq]: "completed" },
      },
    });

    return res.status(200).json({
      status: "success",
      data: {
        totalBookings,
        totalRevenue,
        totalUsers,
        todayBookings,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching dashboard statistics",
    });
  }
}

async function getAllTrending(req, res) {
  //get all booking in 12 month
  try {
    //if frontend send year query, use that year
    const { year } = req.query;
    if (year) {
      const yearInt = parseInt(year, 10);
      if (!isNaN(yearInt) && yearInt > 1970 && yearInt < 3000) {
        // valid year
        const firstMonth = new Date(yearInt, 0, 1); // January 1st of specified year
        firstMonth.setHours(0, 0, 0, 0); // Set to start of day

        const lastMonth = new Date(yearInt, 11, 31, 23, 59, 59, 999); // December 31st of specified year

        const bookings = await Booking.findAll({
          attributes: [
            [
              Booking.sequelize.fn(
                "TO_CHAR",
                Booking.sequelize.col("date"),
                "YYYY-MM"
              ),
              "monthYear",
            ],
            [
              Booking.sequelize.fn("COUNT", Booking.sequelize.col("id")),
              "totalBookings",
            ],
          ],
          where: {
            date: {
              [Op.gte]: firstMonth,
              [Op.lt]: lastMonth,
            },
          },
          group: [
            Booking.sequelize.fn(
              "TO_CHAR",
              Booking.sequelize.col("date"),
              "YYYY-MM"
            ),
          ],
          order: [
            [
              Booking.sequelize.fn(
                "TO_CHAR",
                Booking.sequelize.col("date"),
                "YYYY-MM"
              ),
              "ASC",
            ],
          ],
          raw: true,
        });
        // Format the response
        const formattedBookings = bookings.map((booking) => {
          const [year, month] = booking.monthYear.split("-");
          const date = new Date(year, month - 1); // month is 0-indexed
          return {
            name: date.toLocaleString("default", { month: "long" }),
            totalBookings: parseInt(booking.totalBookings),
          };
        });

        // Create array of all 12 months with 0 bookings as default
        const allMonths = [];
        for (let i = 0; i < 12; i++) {
          const monthDate = new Date(yearInt, i, 1);
          allMonths.push({
            name: monthDate.toLocaleString("default", { month: "long" }),
            totalBookings: 0,
          });
        }

        // Update months that have actual bookings
        formattedBookings.forEach((booking) => {
          const monthIndex = allMonths.findIndex(
            (month) => month.name === booking.name
          );
          if (monthIndex !== -1) {
            allMonths[monthIndex].totalBookings = booking.totalBookings;
          }
        });

        return res.status(200).json(allMonths);
      }
    }

    //get data ffrom this year
    const today = new Date();

    //query for 12 month (January to December of current year)
    const firstMonth = new Date(today.getFullYear(), 0, 1); // January 1st of current year
    firstMonth.setHours(0, 0, 0, 0); // Set to start of day

    const lastMonth = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999); // December 31st of current year

    const bookings = await Booking.findAll({
      attributes: [
        [
          Booking.sequelize.fn(
            "TO_CHAR",
            Booking.sequelize.col("date"),
            "YYYY-MM"
          ),
          "monthYear",
        ],
        [
          Booking.sequelize.fn("COUNT", Booking.sequelize.col("id")),
          "totalBookings",
        ],
      ],
      where: {
        date: {
          [Op.gte]: firstMonth,
          [Op.lt]: lastMonth,
        },
      },
      group: [
        Booking.sequelize.fn(
          "TO_CHAR",
          Booking.sequelize.col("date"),
          "YYYY-MM"
        ),
      ],
      order: [
        [
          Booking.sequelize.fn(
            "TO_CHAR",
            Booking.sequelize.col("date"),
            "YYYY-MM"
          ),
          "ASC",
        ],
      ],
      raw: true,
    });

    // Format the response
    const formattedBookings = bookings.map((booking) => {
      const [year, month] = booking.monthYear.split("-");
      const date = new Date(year, month - 1); // month is 0-indexed
      return {
        name: date.toLocaleString("default", { month: "long" }),
        totalBookings: parseInt(booking.totalBookings),
      };
    });

    // Create array of all 12 months with 0 bookings as default
    const allMonths = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(today.getFullYear(), i, 1);
      allMonths.push({
        name: monthDate.toLocaleString("default", { month: "long" }),
        totalBookings: 0,
      });
    }

    // Update months that have actual bookings
    formattedBookings.forEach((booking) => {
      const monthIndex = allMonths.findIndex(
        (month) => month.name === booking.name
      );
      if (monthIndex !== -1) {
        allMonths[monthIndex].totalBookings = booking.totalBookings;
      }
    });

    return res.status(200).json(allMonths);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching bookings trends",
    });
  }
}

async function getBrachPerformance(req, res) {
  //get all booking in branch
  try {
    const branchPerformance = await Booking.findAll({
      attributes: [
        "branchId",
        [
          Booking.sequelize.fn("COUNT", Booking.sequelize.col("bookings.id")),
          "totalBookings",
        ],
      ],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
      ],
      group: ["branchId", "branch.id", "branch.name"],
      order: [
        [
          Booking.sequelize.fn("COUNT", Booking.sequelize.col("bookings.id")),
          "DESC",
        ],
      ],
    });

    const response = branchPerformance.map((performance) => ({
      branchId: performance.branchId,
      branchName: performance.branch.name,
      totalBookings: performance.dataValues.totalBookings,
    }));

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching branch performance",
    });
  }
}

async function getRecentActivity(req, res) {
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
    const nextDayStart = moment
      .tz([y, m, d, 0, 0, 0, 0], TZ)
      .add(1, "day")
      .toDate();

    //Get recent activity from user
    const recentActivity = await User.findAll({
      attributes: ["id", "displayName", "pictureUrl", "createdAt"],
      where: {
        createdAt: {
          [Op.gte]: startOfDay,
          [Op.lt]: nextDayStart,
        },
      },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    return res.status(200).json(recentActivity);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching recent activity",
    });
  }
}

export { getDasboard, getAllTrending, getBrachPerformance, getRecentActivity };
