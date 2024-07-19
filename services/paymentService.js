const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY).trim();
const stripe = require("stripe")(stripeSecretKey);

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

    user.membershipStatus = "plus";
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
    return_url: `${process.env.CLIENT_URL}/spaces`,
  });
  return session;
};

const handleStripeWebhook = async (event) => {
  try {
    console.log(`Processing event type: ${event.type}`);
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

      case "customer.subscription.updated":
        const updatedSubscription = event.data.object;
        console.log(
          "Subscription update event:",
          JSON.stringify(updatedSubscription, null, 2)
        );

        const userForUpdatedSubscription = await User.findOne({
          stripeCustomerId: updatedSubscription.customer,
        });

        if (userForUpdatedSubscription) {
          console.log(
            `Current user status: ${userForUpdatedSubscription.membershipStatus}`
          );

          // Check if the subscription is cancelled but not yet ended
          if (updatedSubscription.cancel_at_period_end) {
            userForUpdatedSubscription.cancellationPending = true;
            console.log("Setting cancellationPending to true");
          }

          if (updatedSubscription.status === "trialing") {
            userForUpdatedSubscription.membershipStatus = "plus";
            userForUpdatedSubscription.trialEndsAt = new Date(
              updatedSubscription.trial_end * 1000
            );
            console.log(
              `User is in trial until ${userForUpdatedSubscription.trialEndsAt}`
            );
          } else if (updatedSubscription.status === "active") {
            userForUpdatedSubscription.membershipStatus = "plus";
            if (updatedSubscription.cancel_at_period_end) {
              userForUpdatedSubscription.membershipEndsAt = new Date(
                updatedSubscription.current_period_end * 1000
              );
              console.log(
                `Subscription will end at ${userForUpdatedSubscription.membershipEndsAt}`
              );
            } else {
              userForUpdatedSubscription.membershipEndsAt = null;
              console.log(
                "Subscription is active and not scheduled for cancellation"
              );
            }
          } else {
            userForUpdatedSubscription.membershipStatus = "free";
            userForUpdatedSubscription.membershipEndsAt = null;
            userForUpdatedSubscription.cancellationPending = false;
            console.log(
              `Subscription status is ${updatedSubscription.status}. Setting status to free.`
            );
          }

          await userForUpdatedSubscription.save();
          console.log(
            `Updated user status to: ${userForUpdatedSubscription.membershipStatus}`
          );
          console.log(
            `CancellationPending: ${userForUpdatedSubscription.cancellationPending}`
          );
        } else {
          console.log(
            `User not found for customer: ${updatedSubscription.customer}`
          );
        }
        break;

      case "billing_portal.session.created":
        console.log("Billing portal session created");

        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error(`Error handling event type ${event.type}:`, error);
  }
};

const cancelSubscription = async (userId) => {
  console.log(`Attempting to cancel subscription for user ${userId}`);
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User not found for ID: ${userId}`);
      throw new Error("User not found");
    }

    const { stripeSubscriptionId } = user;
    if (stripeSubscriptionId) {
      console.log(`Cancelling Stripe subscription: ${stripeSubscriptionId}`);
      const subscription = await stripe.subscriptions.update(
        stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      user.cancellationPending = true;
      console.log("Setting cancellationPending to true");

      if (subscription.status === "trialing") {
        user.trialEndsAt = new Date(subscription.trial_end * 1000);
        console.log(`User will retain trial access until ${user.trialEndsAt}`);
      } else {
        user.membershipEndsAt = new Date(
          subscription.current_period_end * 1000
        );
        console.log(`Subscription will end at ${user.membershipEndsAt}`);
      }

      await user.save();
      console.log(`Updated user in database:`, JSON.stringify(user, null, 2));
    } else {
      console.log(`No active subscription found for user ${userId}`);
    }
  } catch (error) {
    console.error("Error in cancelSubscription:", error);
    throw error;
  }
};

module.exports = {
  createCheckoutSession,
  createCustomerPortalSession,
  handleStripeWebhook,
  cancelSubscription,
};
