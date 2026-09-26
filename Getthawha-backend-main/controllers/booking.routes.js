import express from "express";
import * as services from "../services/booking.services";
import verifyAdminJwt from "../middlewares/verifyAdminJwt";
const bookingRouter = express.Router();

bookingRouter.use(verifyAdminJwt);

bookingRouter.get("/", async (req, res) => {
  await services.getAllBooking(req, res);
});

bookingRouter.post("/", async (req, res) => {
  await services.createBooking(req, res);
});

bookingRouter.put("/:id", async (req, res) => {
  await services.updateBooking(req, res);
});

bookingRouter.delete("/:id", async (req, res) => {
  await services.deleteBooking(req, res);
});

export default bookingRouter;
