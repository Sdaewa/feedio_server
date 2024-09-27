const stripe = require("stripe");
const paymentService = require("../paymentService");
const Payment = require("../../models/Payment");
const User = require("../../models/user");
const {
  //   sendSubscriptionCreatedEmail,
  //   sendSubscriptionCancelledEmail,
  //   sendTrialEndingSoonEmail,
  //   sendPaymentSucceededEmail,
  //   sendSubscriptionUpdatedEmail,
} = require("../../utils/email");

jest.mock("stripe");
jest.mock("../../models/Payment");
jest.mock("../../models/user");
jest.mock("../../utils/email");

describe("Payment Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createCheckoutSession", () => {
    it("should create a checkout session for a new customer", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        save: jest.fn(),
      };
      const mockCustomer = { id: "cus_123" };
      const mockSession = { id: "cs_123" };

      User.findById.mockResolvedValue(mockUser);
      stripe.customers.create.mockResolvedValue(mockCustomer);
      stripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await paymentService.createCheckoutSession("user123");

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockUser.stripeCustomerId).toBe("cus_123");
      expect(mockUser.membershipStatus).toBe("plus");
      expect(mockUser.save).toHaveBeenCalled();
      expect(stripe.checkout.sessions.create).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it("should create a checkout session for an existing customer", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        stripeCustomerId: "cus_123",
        save: jest.fn(),
      };
      const mockSession = { id: "cs_123" };

      User.findById.mockResolvedValue(mockUser);
      stripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await paymentService.createCheckoutSession("user123");

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(stripe.customers.create).not.toHaveBeenCalled();
      expect(mockUser.membershipStatus).toBe("plus");
      expect(mockUser.save).toHaveBeenCalled();
      expect(stripe.checkout.sessions.create).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it("should throw an error if user is not found", async () => {
      User.findById.mockResolvedValue(null);

      await expect(
        paymentService.createCheckoutSession("nonexistentuser")
      ).rejects.toThrow("User not found");
    });
  });

  describe("createCustomerPortalSession", () => {
    it("should create a customer portal session", async () => {
      const mockUser = {
        _id: "user123",
        stripeCustomerId: "cus_123",
      };
      const mockSession = { url: "https://billing.stripe.com/session" };

      User.findById.mockResolvedValue(mockUser);
      stripe.billingPortal.sessions.create.mockResolvedValue(mockSession);

      const result = await paymentService.createCustomerPortalSession(
        "user123"
      );

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: "cus_123",
        return_url: expect.any(String),
      });
      expect(result).toEqual(mockSession);
    });

    it("should throw an error if user is not found", async () => {
      User.findById.mockResolvedValue(null);

      await expect(
        paymentService.createCustomerPortalSession("nonexistentuser")
      ).rejects.toThrow("User not found");
    });
  });

  describe("handleStripeWebhook", () => {
    it("should handle checkout.session.completed event", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            amount_total: 1000,
            payment_intent: "pi_123",
            payment_status: "paid",
            currency: "usd",
            id: "cs_123",
            metadata: { userId: "user123" },
            subscription: "sub_123",
          },
        },
      };
      const mockUser = {
        _id: "user123",
        payments: [],
        save: jest.fn(),
      };
      const mockPayment = { _id: "payment123" };

      User.findById.mockResolvedValue(mockUser);
      Payment.mockImplementation(() => mockPayment);

      await paymentService.handleStripeWebhook(mockEvent);

      expect(Payment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000,
          transactionId: "pi_123",
          status: "paid",
          currency: "usd",
          stripePaymentId: "cs_123",
          user: "user123",
        })
      );
      expect(mockPayment.save).toHaveBeenCalled();
      expect(mockUser.payments.push).toHaveBeenCalledWith("payment123");
      expect(mockUser.membershipStatus).toBe("plus");
      expect(mockUser.stripeSubscriptionId).toBe("sub_123");
      expect(mockUser.save).toHaveBeenCalled();
    });

    // Add more tests for other event types...
  });

  describe("cancelSubscription", () => {
    it("should cancel a subscription", async () => {
      const mockUser = {
        _id: "user123",
        stripeSubscriptionId: "sub_123",
        save: jest.fn(),
      };
      const mockSubscription = {
        status: "active",
        current_period_end: Math.floor(Date.now() / 1000) + 86400, // 1 day from now
      };

      User.findById.mockResolvedValue(mockUser);
      stripe.subscriptions.update.mockResolvedValue(mockSubscription);

      await paymentService.cancelSubscription("user123");

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_123", {
        cancel_at_period_end: true,
      });
      expect(mockUser.cancellationPending).toBe(true);
      expect(mockUser.membershipEndsAt).toBeInstanceOf(Date);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should not cancel if user has no subscription", async () => {
      const mockUser = {
        _id: "user123",
        stripeSubscriptionId: null,
      };

      User.findById.mockResolvedValue(mockUser);

      await paymentService.cancelSubscription("user123");

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it("should throw an error if user is not found", async () => {
      User.findById.mockResolvedValue(null);

      await expect(
        paymentService.cancelSubscription("nonexistentuser")
      ).rejects.toThrow("User not found");
    });
  });
});
