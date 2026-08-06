import express from "express";
import * as services from "../services/branch.services";
import verifyAdminJwt from "../middlewares/verifyAdminJwt";
const branchRouter = express.Router();

branchRouter.use(verifyAdminJwt);

branchRouter.get("/", async (req, res) => {
  await services.getAllBranch(req, res);
});

branchRouter.post("/", async (req, res) => {
  await services.createBranch(req, res);
});

branchRouter.put("/:id", async (req, res) => {
  await services.updateBranch(req, res);
});

branchRouter.delete("/:id", async (req, res) => {
  await services.deleteBranch(req, res);
});

export default branchRouter;
