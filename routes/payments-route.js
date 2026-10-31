const express = require("express");

const paymentController = require("../controllers/paymentController");
const checkAuth = require("../middleware/check-auth");

const router = express.Router({ mergeParams: true });

// The user is always the owner of the token. Never read the user id from the
// URL or body here: that would let one user act on another user's billing.
router.post(
  "/create-checkout-session",
  checkAuth,
  paymentController.createCheckoutSession
);
router.post(
  "/create-customer-portal-session",
  checkAuth,
  paymentController.createCustomerPortalSession
);
router.post("/cancel-subscription", checkAuth, paymentController.cancelSubscription);

// Public on purpose: Stripe calls this. It is authenticated by the Stripe
// signature (constructEvent), not by a user token.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleStripeWebhook
);

module.exports = router;
