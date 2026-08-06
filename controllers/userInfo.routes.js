import express from "express";
import * as services from "../services/userinfo.services";
import verifyUserJwt from "../middlewares/verifyUserJwt";
const userInfoRouter = express.Router();

userInfoRouter.use(verifyUserJwt);

userInfoRouter.get("/me", async (req, res) => {
  await services.isAuth(req, res);
});

export default userInfoRouter;
