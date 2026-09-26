import express from "express";
import verifyUserJwt from "../middlewares/verifyUserJwt";
import {
  createReview,
  getBranchReviews,
  getUserReviews,
  getTestimonials,
} from "../services/review.services";

const userReviewRouter = express.Router();

userReviewRouter.get("/me", verifyUserJwt, async (req, res) => {
  await getUserReviews(req, res);
});

userReviewRouter.get("/testimonials", async (req, res) => {
  await getTestimonials(req, res);
});

userReviewRouter.get("/branch/:branchId", async (req, res) => {
  await getBranchReviews(req, res);
});

userReviewRouter.post("/", verifyUserJwt, async (req, res) => {
  await createReview(req, res);
});

export default userReviewRouter;
