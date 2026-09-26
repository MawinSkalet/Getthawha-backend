import express from "express";
import * as services from "../services/user.services";
import verifyAdminJwt from "../middlewares/verifyAdminJwt";
const userRouter = express.Router();

userRouter.use(verifyAdminJwt);

userRouter.get("/", async (req, res) => {
  await services.getAllUsers(req, res);
});

userRouter.get("/search", async (req, res) => {
  await services.searchUsers(req, res);
});

userRouter.get("/:id", async (req, res) => {
  await services.getUserById(req, res);
});

export default userRouter;
