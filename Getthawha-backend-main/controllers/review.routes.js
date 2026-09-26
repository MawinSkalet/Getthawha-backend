import express from "express";
import verifyAdminJwt from "../middlewares/verifyAdminJwt";
import {
  adminListReviews,
  updateReviewApproval,
  deleteReview,
} from "../services/review.services";

const reviewRouter = express.Router();

reviewRouter.use(verifyAdminJwt);

reviewRouter.get("/", async (req, res) => {
  await adminListReviews(req, res);
});

reviewRouter.patch("/:id/approval", async (req, res) => {
  await updateReviewApproval(req, res);
});

reviewRouter.delete("/:id", async (req, res) => {
  await deleteReview(req, res);
});

export default reviewRouter;
