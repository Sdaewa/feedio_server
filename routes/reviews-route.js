const express = require("express");
const { check } = require("express-validator");

const reviewController = require("../controllers/reviewController");

const router = express.Router();

router.use((req, res, next) => {
  next();
});

router.post(
  "/create-review-for-widget",
  (req, res, next) => {
    console.log("Received request to create-review-for-widget");
    console.log("Request body:", req.body);
    next();
  },
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

router.get("/:pid/all", reviewController.getAllReviews);

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

router.get("/keywords", reviewController.getWordCloudData);

router.get("/trends", reviewController.getRatingsTrend);

router.delete("/:rid", reviewController.deleteReview);

module.exports = router;
