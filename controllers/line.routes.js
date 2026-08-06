import express from "express";
import * as services from "../services/line.services";
const lineRouter = express.Router();

lineRouter.get("/authentication", async (req, res) => {
  await services.authentication(req, res);
});

lineRouter.get("/authorization", async (req, res) => {
  await services.authorization(req, res);
});

lineRouter.post("/authorization", async (req, res) => {
  await services.authorization(req, res);
});

lineRouter.get("/logout", async (req, res) => {
  await services.logout(req, res);
});

export default lineRouter;
