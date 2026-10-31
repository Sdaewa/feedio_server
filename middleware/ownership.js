const Product = require("../models/Product");
const Widget = require("../models/Widget");
const { Review } = require("../models/review");
const { AppError } = require("./error-handler");

// Authorization helpers. check-auth proves WHO the caller is (req.userData);
// these prove the resource BELONGS to that caller. Use them after check-auth.
//
// Each factory takes a function that reads the resource id from the request,
// because the id lives in a different place per route (params, body, query).

const OBJECT_ID = /^[a-f\d]{24}$/i;

const assertValidId = (id, label) => {
  if (!OBJECT_ID.test(String(id))) {
    throw new AppError(400, `Invalid ${label} id`);
  }
};

// Throws unless the product exists and belongs to userId. Returns the product.
const loadOwnedProduct = async (productId, userId) => {
  assertValidId(productId, "product");

  const product = await Product.findById(productId).select("user");
  if (!product) {
    throw new AppError(404, "Product not found");
  }
  if (String(product.user) !== String(userId)) {
    throw new AppError(403, "You do not have access to this product");
  }
  return product;
};

const requireProductOwner = (getProductId) => async (req, res, next) => {
  try {
    req.product = await loadOwnedProduct(getProductId(req), req.userData.userId);
    next();
  } catch (error) {
    next(error);
  }
};

const requireReviewOwner = (getReviewId) => async (req, res, next) => {
  try {
    const reviewId = getReviewId(req);
    assertValidId(reviewId, "review");

    const review = await Review.findById(reviewId).select("product");
    if (!review) {
      throw new AppError(404, "Review not found");
    }
    req.product = await loadOwnedProduct(review.product, req.userData.userId);
    next();
  } catch (error) {
    next(error);
  }
};

const requireWidgetOwner = (getWidgetId) => async (req, res, next) => {
  try {
    const widgetId = getWidgetId(req);
    assertValidId(widgetId, "widget");

    const widget = await Widget.findById(widgetId).select("product");
    if (!widget) {
      throw new AppError(404, "Widget not found");
    }
    req.product = await loadOwnedProduct(widget.product, req.userData.userId);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireProductOwner,
  requireReviewOwner,
  requireWidgetOwner,
};
