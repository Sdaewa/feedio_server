const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");

const reviewController = require("../controllers/reviewController");

const router = express.Router();

// Public routes
router.get("/:pid/all", reviewController.getAllReviews);
router.post(
  "/create-review-for-widget",
  [
    check("name").not().isEmpty().withMessage("Name is required"),
    check("email").isEmail().withMessage("Please enter a valid email"),
    check("feedback").not().isEmpty().withMessage("Feedback is required"),
    check("rating").isNumeric().withMessage("Rating must be a number"),
    check("productId").not().isEmpty().withMessage("Product ID is required"),
    check("npsScore").isNumeric().withMessage("NPS Score must be a number"),
  ],
  reviewController.createReviewForWidget
);

// Protected routes
router.use(checkAuth);

router.post(
  "/create-review",
  [
    check("name").not().isEmpty().withMessage("Name is required"),
    check("email").isEmail().withMessage("Please enter a valid email"),
    check("feedback").not().isEmpty().withMessage("Feedback is required"),
    check("rating").isNumeric().withMessage("Rating must be a number"),
    check("productId").not().isEmpty().withMessage("Product ID is required"),
  ],
  reviewController.createReview
);

router.post("/:rid/favorite", reviewController.updateFavoriteStatus);
router.get("/product/:pid/keywords", reviewController.getWordCloudData);
router.get("/product/:pid/trends", reviewController.getRatingsTrend);
router.delete("/:rid", reviewController.deleteReview);

module.exports = router;
