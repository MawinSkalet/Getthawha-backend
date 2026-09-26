import express from "express";
import * as services from "../services/staffAuth.services";
import verifyAdminJwt from "../middlewares/verifyAdminJwt";
const staffAuthRouter = express.Router();

staffAuthRouter.post("/login", async (req, res) => {
  await services.login(req, res);
});

staffAuthRouter.get("/info", async (req, res) => {
  await services.isAuth(req, res);
});

// Protected route example

staffAuthRouter.get("/", verifyAdminJwt, async (req, res) => {
  await services.getAllUsers(req, res);
});

staffAuthRouter.post("/register", verifyAdminJwt, async (req, res) => {
  await services.register(req, res);
});

staffAuthRouter.delete("/delete/:id", verifyAdminJwt, async (req, res) => {
  await services.deleteUser(req, res);
});

staffAuthRouter.post("/logout", async (req, res) => {
  await services.logout(req, res);
});

export default staffAuthRouter;
