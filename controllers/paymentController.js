const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const paymentService = require("../services/paymentService");

exports.createCheckoutSession = async (req, res) => {
  const { id } = req.params;
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
    console.error("Stripe-Signature header:", sig);
    console.error("Webhook Secret:", process.env.STRIPE_WEBHOOK_SECRET);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

exports.cancelSubscription = async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`Received cancellation request for user ${id}`);
    await paymentService.cancelSubscription(id);
    console.log(`Cancellation completed for user ${id}`);

    const updatedUser = await User.findById(id);
    console.log(`Updated user data:`, JSON.stringify(updatedUser, null, 2));

    res.json({
      message: "Subscription cancelled successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in cancelSubscription controller:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
};
