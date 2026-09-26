import express from "express";
import * as services from "../services/userbooking.services";
import verifyUserJwt from "../middlewares/verifyUserJwt";
const userBookingRouter = express.Router();

userBookingRouter.use(verifyUserJwt);

userBookingRouter.get("/", async (req, res) => {
  await services.getAllBooking(req, res);
});

userBookingRouter.post("/", async (req, res) => {
  await services.createBooking(req, res);
});

userBookingRouter.put("/:id", async (req, res) => {
  await services.updateBooking(req, res);
});

userBookingRouter.delete("/:id", async (req, res) => {
  await services.deleteBooking(req, res);
});

export default userBookingRouter;
