import express from "express";
import * as services from "../services/line.services";
import {devLoginAllowed} from "../services/google.config";
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

lineRouter.get("/dev-login", async (req, res) => {
  if (!devLoginAllowed()) return res.sendStatus(404);
  await services.devLogin(req, res);
});

export default lineRouter;
