import express from "express";
import * as services from "../services/voucher.services";
import verifyUserJwt from "../middlewares/verifyUserJwt";
const voucherRouter = express.Router();

voucherRouter.use(verifyUserJwt);

voucherRouter.get("/:code", async (req, res) => {
  await services.checkVoucherValidity(req, res);
});

export default voucherRouter;
