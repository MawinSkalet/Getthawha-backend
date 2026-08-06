import express from "express";
import * as services from "../services/calendar.services";
import verifyAdminJwt from "../middlewares/verifyAdminJwt";
const calendarRouter = express.Router();

calendarRouter.use(verifyAdminJwt);

calendarRouter.get("/date/:day/:month/:year", async (req, res) => {
  await services.getBookingByDate(req, res);
});

calendarRouter.get("/:year/:month", async (req, res) => {
  await services.getDailyBookingStatusByMonth(req, res);
});

export default calendarRouter;
