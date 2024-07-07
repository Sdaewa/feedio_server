const stripe = require("stripe")(
  "sk_test_51NS5wyCbn1CFQkB8T1TZaH2UqOFaHp8taw4kfF5RyuFLSIrWfY0KhJDp1gFUldX8rc6QEkhxaT9vCYqBjxDuznkW00SIzhL19C"
);
// const stripeApiKey = process.env.STRIPE_SECRET_KEY;
// const stripe = require("stripe")(stripeApiKey);

const Payment = require("../models/Payment");
const User = require("../models/user");

const createCheckoutSession = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email });
      user.stripeCustomerId = customer.id;
    }

    // Immediately update the user's membership status
    user.membershipStatus = "premium";
    await user.save();

    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [{ price: process.env.PRICE_ID, quantity: 1 }],
      mode: "subscription",
      subscription_data: { trial_period_days: 14 },
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/spaces`,
      metadata: { userId: userId },
    });

    return session;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
};

const createCustomerPortalSession = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/dashboard`,
  });
  return session;
};

const handleStripeWebhook = async (event) => {
  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
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
        // Confirm the membership status
        user.membershipStatus = "plus";
        user.stripeSubscriptionId = session.subscription;
        await user.save();
        break;

      case "setup_intent.succeeded":
        const setupIntent = event.data.object;
        try {
          const user = await User.findOne({
            stripeCustomerId: setupIntent.customer,
          });
          if (user) {
            user.defaultPaymentMethod = setupIntent.payment_method;
            await user.save();

            // notification
            console.log(`Default payment method updated for user ${user._id}`);
          }
        } catch (error) {
          console.error("Error handling setup_intent.succeeded:", error);
        }
        break;

      case "setup_intent.created":
        const setupIntentCreation = event.data.object;
        try {
          console.log(`Setup Intent created: ${setupIntentCreation.id}`);
        } catch (error) {
          console.error("Error handling setup_intent.created:", error);
        }
        break;

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        const userForPayment = await User.findOne({
          stripeCustomerId: paymentIntent.customer,
        });
        if (userForPayment) {
          const newPayment = new Payment({
            user: userForPayment._id,
            amount: paymentIntent.amount_received,
            transactionId: paymentIntent.id,
            status: "succeeded",
          });
          await newPayment.save();
          userForPayment.payments.push(newPayment._id);
          await userForPayment.save();
        }
        break;

      case "payment_intent.failed":
        const failedPaymentIntent = event.data.object;
        const userForFailedPayment = await User.findOne({
          stripeCustomerId: failedPaymentIntent.customer,
        });

        if (userForFailedPayment) {
          const failedPaymentRecord = new Payment({
            user: userForFailedPayment._id,
            stripePaymentId: failedPaymentIntent.id,
            status: "failed",
            amount: failedPaymentIntent.amount_to_be_paid,
            currency: failedPaymentIntent.currency,
          });
          await failedPaymentRecord.save();
          userForFailedPayment.payments.push(failedPaymentRecord._id);
          await userForFailedPayment.save();

          // Update user's account status if necessary
          // Notify user

          console.log(
            `Failed payment for user ${userForFailedPayment._id}: ${failedPaymentIntent.id}`
          );
        }
        break;

      case "customer.subscription.created":
        const newSubscription = event.data.object;
        const userForNewSubscription = await User.findOne({
          stripeCustomerId: newSubscription.customer,
        });

        if (userForNewSubscription) {
          userForNewSubscription.stripeSubscriptionId = newSubscription.id;
          userForNewSubscription.membershipStatus = "plus";
          await userForNewSubscription.save();

          console.log(
            `New subscription for user ${userForNewSubscription._id}: ${newSubscription.id}`
          );

          // Notify
        }
        break;

      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object;
        const userForCancellation = await User.findOne({
          stripeCustomerId: deletedSubscription.customer,
        });
        if (userForCancellation) {
          userForCancellation.membershipStatus = "free";
          await userForCancellation.save();
        }
        break;

      case "customer.subscription.trial_will_end":
        const subscription = event.data.object;
        const userForTrialEnd = await User.findOne({
          stripeCustomerId: subscription.customer,
        });
        if (userForTrialEnd) {
          // notify
          console.log(`Trial will end soon for user ${userForTrialEnd.name}`);
        }
        break;

      case "invoice.created":
        const invoice = event.data.object;
        const userForInvoice = await User.findOne({
          stripeCustomerId: invoice.customer,
        });
        if (userForInvoice) {
          // Add invoice details to the user's account
          userForInvoice.invoices.push({
            invoiceId: invoice.id,
            amount: invoice.amount_due,
            status: invoice.status,
          });
          await userForInvoice.save();

          // notify
        }
        break;

      case "invoice.finalized":
        const finalizedInvoice = event.data.object;
        const userForFinalizedInvoice = await User.findOne({
          stripeCustomerId: finalizedInvoice.customer,
        });
        if (userForFinalizedInvoice) {
          // Update the invoice details in the user's account
          const userInvoice = userForFinalizedInvoice.invoices.find(
            (invoice) => invoice.invoiceId === finalizedInvoice.id
          );
          if (userInvoice) {
            userInvoice.status = "finalized";
            await userForFinalizedInvoice.save();
          }

          // notify
        }
        break;

      case "invoice.payment_succeeded":
        const successfulInvoice = event.data.object;
        const userForSuccessfulPayment = await User.findOne({
          stripeCustomerId: successfulInvoice.customer,
        });
        if (userForSuccessfulPayment) {
          // Update payment status and log the successful payment
          const paymentRecord = new Payment({
            user: userForSuccessfulPayment._id,
            stripePaymentId: successfulInvoice.id,
            status: "succeeded",
            amount: successfulInvoice.amount_paid,
            currency: successfulInvoice.currency,
          });
          await paymentRecord.save();
          userForSuccessfulPayment.payments.push(paymentRecord._id);
          await userForSuccessfulPayment.save();
        }
        break;

      case "invoice.paid":
        const paidInvoice = event.data.object;
        const userForPaidInvoice = await User.findOne({
          stripeCustomerId: paidInvoice.customer,
        });
        if (userForPaidInvoice) {
          // Record the paid invoice and update user status
          const paymentRecord = new Payment({
            user: userForPaidInvoice._id,
            stripePaymentId: paidInvoice.id,
            status: "paid",
            amount: paidInvoice.amount_paid,
            currency: paidInvoice.currency,
          });
          await paymentRecord.save();
          userForPaidInvoice.payments.push(paymentRecord._id);
          await userForPaidInvoice.save();
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error(`Error handling event type ${event.type}:`, error);
  }
};

const cancelSubscription = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const { stripeSubscriptionId } = user;
    await stripe.subscriptions.del(stripeSubscriptionId);
    user.membershipStatus = "free";
    await user.save();
  } catch (error) {
    console.error("Error in cancelSubscription:", error.message);

    throw error;
  }
};

module.exports = {
  createCheckoutSession,
  createCustomerPortalSession,
  handleStripeWebhook,
  cancelSubscription,
};

// New cases
// [0] Unhandled event type billing_portal.session.created
// case "customer.created":
//   case "customer.updated":
//     // Logic for customer creation or update
//     break;

//   case "customer.deleted":
//     // Logic for customer deletion
//     break;

//   case "customer.subscription.updated":
//     // Logic for subscription updates
//     break;

//   case "invoice.payment_failed":
//     // Logic for failed invoice payment
//     break;

//   case "charge.succeeded":
//   case "charge.failed":
//     // Logic for charge success or failure
//     break;

//   case "payment_method.attached":
//   case "payment_method.detached":
//     // Logic for payment method attachment or detachment
//     break;

//   case "subscription_schedule.created":
//   case "subscription_schedule.updated":
//   case "subscription_schedule.released":
//     // Logic for subscription schedule events
//     break;

//   case "product.created":
//   case "product.updated":
//   case "product.deleted":
//     // Logic for product lifecycle events
//     break;
