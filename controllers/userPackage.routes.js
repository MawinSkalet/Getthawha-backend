import express from "express";
import * as services from "../services/package.services";
const userPackageRouter = express.Router();

userPackageRouter.get("/", async (req, res) => {
  await services.getAllPackage(req, res);
});

export default userPackageRouter;
