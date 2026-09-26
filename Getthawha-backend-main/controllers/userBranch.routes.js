import express from "express";
import * as services from "../services/branch.services";
const userBranchRouter = express.Router();

userBranchRouter.get("/", async (req, res) => {
  await services.getAllBranch(req, res);
});

export default userBranchRouter;
