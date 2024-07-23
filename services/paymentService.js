const stripe = require("stripe")(String(process.env.STRIPE_SECRET_KEY).trim());
const Payment = require("../models/Payment");
const User = require("../models/user");
const {
  sendSubscriptionCreatedEmail,
  sendSubscriptionCancelledEmail,
  sendTrialEndingSoonEmail,
  sendPaymentSucceededEmail,
  sendSubscriptionUpdatedEmail,
} = require("../utils/email");

const createCheckoutSession = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (!user.stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user.email });
    user.stripeCustomerId = customer.id;
  }

  user.membershipStatus = "plus";
  await user.save();

  return stripe.checkout.sessions.create({
    customer: user.stripeCustomerId,
    payment_method_types: ["card"],
    line_items: [{ price: process.env.PRICE_ID, quantity: 1 }],
    mode: "subscription",
    subscription_data: { trial_period_days: 14 },
    success_url: `${process.env.CLIENT_URL}/success`,
    cancel_url: `${process.env.CLIENT_URL}/spaces`,
    metadata: { userId: userId },
  });
};

const createCustomerPortalSession = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  return stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/spaces`,
  });
};

const handleStripeWebhook = async (event) => {
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(event.data.object);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case "payment_intent.failed":
        await handlePaymentIntentFailed(event.data.object);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "customer.subscription.trial_will_end":
        await handleSubscriptionTrialWillEnd(event.data.object);
        break;
      case "invoice.created":
      case "invoice.finalized":
      case "invoice.paid":
        await handleInvoiceEvent(event.data.object, event.type);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error(`Error handling event type ${event.type}:`, error);
  }
};

const cancelSubscription = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const { stripeSubscriptionId } = user;
  if (!stripeSubscriptionId) return;

  const subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  user.cancellationPending = true;
  user.trialEndsAt =
    subscription.status === "trialing"
      ? new Date(subscription.trial_end * 1000)
      : null;
  user.membershipEndsAt =
    subscription.status !== "trialing"
      ? new Date(subscription.current_period_end * 1000)
      : null;

  await user.save();
};

// Helper functions for handleStripeWebhook
async function handleCheckoutSessionCompleted(session) {
  const payment = new Payment({
    amount: session.amount_total,
    transactionId: session.payment_intent,
    status: session.payment_status,
    currency: session.currency,
    stripePaymentId: session.id,
    user: session.metadata.userId,
  });
  await payment.save();

  const user = await User.findById(session.metadata.userId);
  user.payments.push(payment._id);
  user.membershipStatus = "plus";
  user.stripeSubscriptionId = session.subscription;
  await user.save();
}

async function handleSetupIntentSucceeded(setupIntent) {
  const user = await User.findOne({ stripeCustomerId: setupIntent.customer });
  if (user) {
    user.defaultPaymentMethod = setupIntent.payment_method;
    await user.save();
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  const user = await User.findOne({ stripeCustomerId: paymentIntent.customer });
  if (user) {
    const newPayment = new Payment({
      user: user._id,
      amount: paymentIntent.amount_received,
      transactionId: paymentIntent.id,
      status: "succeeded",
    });
    await newPayment.save();
    user.payments.push(newPayment._id);
    await user.save();
  }
}

async function handlePaymentIntentFailed(failedPaymentIntent) {
  const user = await User.findOne({
    stripeCustomerId: failedPaymentIntent.customer,
  });
  if (user) {
    const failedPaymentRecord = new Payment({
      user: user._id,
      stripePaymentId: failedPaymentIntent.id,
      status: "failed",
      amount: failedPaymentIntent.amount_to_be_paid,
      currency: failedPaymentIntent.currency,
    });
    await failedPaymentRecord.save();
    user.payments.push(failedPaymentRecord._id);
    await user.save();
  }
}

async function handleSubscriptionCreated(newSubscription) {
  const user = await User.findOne({
    stripeCustomerId: newSubscription.customer,
  });
  if (user) {
    user.stripeSubscriptionId = newSubscription.id;
    user.membershipStatus = "plus";
    await user.save();
    await sendSubscriptionCreatedEmail(user, {
      planName: "Plus Plan",
      startDate: newSubscription.start_date,
    });
  }
}

async function handleSubscriptionDeleted(deletedSubscription) {
  const user = await User.findOne({
    stripeCustomerId: deletedSubscription.customer,
  });
  if (user) {
    user.membershipStatus = "free";
    await user.save();
    await sendSubscriptionCancelledEmail(user);
  }
}

async function handleSubscriptionTrialWillEnd(subscription) {
  const user = await User.findOne({ stripeCustomerId: subscription.customer });
  if (user) {
    const daysLeft = Math.ceil(
      (subscription.trial_end - Date.now() / 1000) / 86400
    );
    await sendTrialEndingSoonEmail(user, daysLeft);
  }
}

async function handleInvoiceEvent(invoice, eventType) {
  const user = await User.findOne({ stripeCustomerId: invoice.customer });
  if (user) {
    const invoiceData = {
      invoiceId: invoice.id,
      amount: invoice.amount_due,
      status: eventType === "invoice.finalized" ? "finalized" : invoice.status,
    };

    const existingInvoiceIndex = user.invoices.findIndex(
      (inv) => inv.invoiceId === invoice.id
    );
    if (existingInvoiceIndex !== -1) {
      user.invoices[existingInvoiceIndex] = invoiceData;
    } else {
      user.invoices.push(invoiceData);
    }

    await user.save();
  }
}

async function handleInvoicePaymentSucceeded(successfulInvoice) {
  const user = await User.findOne({
    stripeCustomerId: successfulInvoice.customer,
  });
  if (user) {
    const paymentRecord = new Payment({
      user: user._id,
      stripePaymentId: successfulInvoice.id,
      status: "succeeded",
      amount: successfulInvoice.amount_paid,
      currency: successfulInvoice.currency,
    });
    await paymentRecord.save();
    user.payments.push(paymentRecord._id);
    await user.save();
    await sendPaymentSucceededEmail(user, paymentRecord);
  }
}

async function handleSubscriptionUpdated(updatedSubscription) {
  const user = await User.findOne({
    stripeCustomerId: updatedSubscription.customer,
  });
  if (user) {
    user.cancellationPending = updatedSubscription.cancel_at_period_end;
    user.membershipStatus =
      updatedSubscription.status === "active" ||
      updatedSubscription.status === "trialing"
        ? "plus"
        : "free";
    user.trialEndsAt =
      updatedSubscription.status === "trialing"
        ? new Date(updatedSubscription.trial_end * 1000)
        : null;
    user.membershipEndsAt = updatedSubscription.cancel_at_period_end
      ? new Date(updatedSubscription.current_period_end * 1000)
      : null;
    await user.save();
    await sendSubscriptionUpdatedEmail(user, updatedSubscription);
  }
}

module.exports = {
  createCheckoutSession,
  createCustomerPortalSession,
  handleStripeWebhook,
  cancelSubscription,
};
