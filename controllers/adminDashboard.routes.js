import express from "express";
import * as services from "../services/adminDashboard.services";
import verifyAdminJwt from "../middlewares/verifyAdminJwt";
const adminDasboardRouter = express.Router();

adminDasboardRouter.use(verifyAdminJwt);

adminDasboardRouter.get("/", async (req, res) => {
  await services.getDasboard(req, res);
});

adminDasboardRouter.get("/trending", async (req, res) => {
  await services.getAllTrending(req, res);
});

adminDasboardRouter.get("/branch-performance", async (req, res) => {
  await services.getBrachPerformance(req, res);
});

adminDasboardRouter.get("/recent-activity/:day/:month/:year", async (req, res) => {
  await services.getRecentActivity(req, res);
});
export default adminDasboardRouter;
