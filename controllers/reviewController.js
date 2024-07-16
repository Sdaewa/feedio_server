const { validationResult } = require("express-validator");

const reviewService = require("../services/reviewService");

exports.createReview = async (req, res) => {
  const { name, email, feedback, rating, productId, npsScore } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const newReview = await reviewService.create({
      name,
      email,
      feedback,
      rating,
      productId,
      npsScore,
    });

    res
      .status(201)
      .json({ message: "Review created successfully", review: newReview });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

exports.createReviewForWidget = async (req, res) => {
  const { name, email, feedback, rating, productId, npsScore } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array());
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const newReview = await reviewService.widgetReview({
      name,
      email,
      feedback,
      rating,
      productId,
      npsScore,
    });
    console.log("Review created successfully:", newReview);
    res
      .status(201)
      .json({ message: "Review created successfully", review: newReview });
  } catch (error) {
    console.error("Error creating review:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

exports.getAllReviews = async (req, res) => {
  const { pid } = req.params;
  const { status } = req.query;

  try {
    const reviews = await reviewService.getAll(pid, status);

    res.status(200).json({ reviews: reviews });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

exports.updateFavoriteStatus = async (req, res) => {
  const { rid } = req.params;
  const { status } = req.body;

  try {
    const updatedReview = await reviewService.updateFavoriteStatus(rid, status);
    res
      .status(200)
      .json({ message: "Favorite status updated", review: updatedReview });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  const { rid } = req.params;

  try {
    const message = await reviewService.deleteOne(rid);
    res.status(200).json({ message: message });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

exports.getWordCloudData = async (req, res, next) => {
  const productId = req.mainParams.pid;

  try {
    const wordCounts = await reviewService.getWordCloudData(productId);

    res.status(200).json(wordCounts);
  } catch (err) {
    res.status(500).json({ error: "Server error", message: err.message });
  }
};

exports.getRatingsTrend = async (req, res) => {
  const productId = req.mainParams.pid;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  try {
    const trends = await reviewService.getRatingsTrend(
      productId,
      startDate,
      endDate
    );

    res.status(200).json(trends);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};
