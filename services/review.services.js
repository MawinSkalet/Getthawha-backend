import { Review, Booking, Branch, User } from "../models/index";

async function createReview(req, res) {
  try {
    const { branchId, rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "User not authorized to perform this action",
      });
    }

    if (!branchId || typeof rating === "undefined") {
      return res.status(400).json({
        status: "error",
        message: "Branch and rating are required",
      });
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        status: "error",
        message: "Rating must be an integer between 1 and 5",
      });
    }

    const branch = await Branch.findByPk(branchId, { attributes: ["id"] });
    if (!branch) {
      return res.status(404).json({
        status: "error",
        message: "Branch not found",
      });
    }

    const existingReview = await Review.findOne({
      where: { userId, branchId },
      attributes: ["id"],
    });

    if (existingReview) {
      return res.status(409).json({
        status: "error",
        message: "You have already submitted a review for this branch",
      });
    }

    const completedBooking = await Booking.findOne({
      where: { userId, branchId, status: "completed" },
      attributes: ["id"],
    });

    if (!completedBooking) {
      return res.status(403).json({
        status: "error",
        message: "You can only review branches you have completed a booking with",
      });
    }

    const review = await Review.create({
      userId,
      branchId,
      rating: parsedRating,
      comment: comment?.trim() || null,
    });

    return res.status(201).json({
      status: "success",
      message: "Review submitted successfully",
      review: {
        id: review.id,
        userId: review.userId,
        branchId: review.branchId,
        rating: review.rating,
        comment: review.comment,
        isApproved: review.isApproved,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while submitting the review",
    });
  }
}

async function getUserReviews(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "User not authorized to perform this action",
      });
    }

    const reviews = await Review.findAll({
      where: { userId },
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(reviews);
  } catch (error) {
    console.error("Error retrieving user reviews:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving your reviews",
    });
  }
}

async function getBranchReviews(req, res) {
  try {
    const { branchId } = req.params;

    const branch = await Branch.findByPk(branchId, { attributes: ["id"] });
    if (!branch) {
      return res.status(404).json({
        status: "error",
        message: "Branch not found",
      });
    }

    const reviews = await Review.findAll({
      where: { branchId, isApproved: true },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "displayName", "pictureUrl"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(reviews);
  } catch (error) {
    console.error("Error retrieving branch reviews:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving reviews",
    });
  }
}

async function getTestimonials(req, res) {
  try {
    const testimonials = await Review.findAll({
      where: { isApproved: true },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "displayName", "pictureUrl"],
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
      ],
      order: [
        ["rating", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: 6,
    });

    return res.status(200).json(testimonials);
  } catch (error) {
    console.error("Error retrieving testimonials:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving testimonials",
    });
  }
}

async function adminListReviews(req, res) {
  try {
    const { status } = req.query;
    const where = {};

    if (status === "approved") {
      where.isApproved = true;
    } else if (status === "pending") {
      where.isApproved = false;
    }

    const reviews = await Review.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "displayName", "pictureUrl"],
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(reviews);
  } catch (error) {
    console.error("Error retrieving reviews:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving reviews",
    });
  }
}

async function updateReviewApproval(req, res) {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    if (typeof isApproved !== "boolean") {
      return res.status(400).json({
        status: "error",
        message: "isApproved must be provided as a boolean",
      });
    }

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    await review.update({ isApproved });

    return res.status(200).json({
      status: "success",
      message: isApproved
        ? "Review approved successfully"
        : "Review marked as pending",
      review: {
        id: review.id,
        userId: review.userId,
        branchId: review.branchId,
        rating: review.rating,
        comment: review.comment,
        isApproved: review.isApproved,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating review approval:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating review approval",
    });
  }
}

async function deleteReview(req, res) {
  try {
    const { id } = req.params;

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    await review.destroy();

    return res.status(204).json();
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the review",
    });
  }
}

export {
  createReview,
  getUserReviews,
  getBranchReviews,
  getTestimonials,
  adminListReviews,
  updateReviewApproval,
  deleteReview,
};
