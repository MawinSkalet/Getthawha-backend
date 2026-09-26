import express from "express";
import * as services from "../services/voucher.services";
import verifyAdminJwt from "../middlewares/verifyAdminJwt";
const voucherRouter = express.Router();

voucherRouter.use(verifyAdminJwt);

voucherRouter.get("/", async (req, res) => {
  await services.getAllVoucher(req, res);
});

voucherRouter.post("/", async (req, res) => {
  await services.createVoucher(req, res);
});

voucherRouter.put("/:id", async (req, res) => {
  await services.updateVoucher(req, res);
});

voucherRouter.delete("/:id", async (req, res) => {
  await services.deleteVoucher(req, res);
});

export default voucherRouter;
