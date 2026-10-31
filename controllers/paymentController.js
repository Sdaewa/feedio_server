const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const User = require("../models/user");
const paymentService = require("../services/paymentService");

exports.createCheckoutSession = async (req, res) => {
  const id = req.userData.userId;
  try {
    const session = await paymentService.createCheckoutSession(id);
    res.json({ id: session.id });
  } catch (error) {
    res.status(500).send({
      error: "An error occurred while trying to create a checkout session.",
    });
  }
};

exports.createCustomerPortalSession = async (req, res) => {
  try {
    const session = await paymentService.createCustomerPortalSession(
      req.userData.userId
    );
    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating customer portal session:", error);
    res.status(500).json({ error: "Failed to create customer portal session" });
  }
};

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  try {
    console.log("Received webhook. Attempting to construct event...");
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log("Event constructed successfully. Type:", event.type);
    await paymentService.handleStripeWebhook(event);
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

exports.cancelSubscription = async (req, res) => {
  const id = req.userData.userId;
  try {
    console.log(`Received cancellation request for user ${id}`);
    await paymentService.cancelSubscription(id);
    console.log(`Cancellation completed for user ${id}`);

    // Send only what the client needs. The full user document contains the
    // password hash and Stripe ids, and must never be logged or returned.
    const updatedUser = await User.findById(id);

    res.json({
      message: "Subscription cancelled successfully",
      user: {
        membershipStatus: updatedUser.membershipStatus,
        cancellationPending: updatedUser.cancellationPending,
        trialEndsAt: updatedUser.trialEndsAt,
        membershipEndsAt: updatedUser.membershipEndsAt,
      },
    });
  } catch (error) {
    console.error("Error in cancelSubscription controller:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
};
