import express from "express";
import * as services from "../services/package.services";
import verifyAdminJwt from "../middlewares/verifyAdminJwt";
const packageRouter = express.Router();

packageRouter.use(verifyAdminJwt);

packageRouter.get("/", async (req, res) => {
  await services.getAllPackage(req, res);
});

packageRouter.post("/", async (req, res) => {
  await services.createPackage(req, res);
});

packageRouter.put("/:id", async (req, res) => {
  await services.updatePackage(req, res);
});

packageRouter.delete("/:id", async (req, res) => {
  await services.deletePackage(req, res);
});

export default packageRouter;
