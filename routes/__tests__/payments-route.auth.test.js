const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_key_for_tests";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret_value_12345";

jest.mock("../../services/paymentService", () => ({
  createCheckoutSession: jest.fn(),
  createCustomerPortalSession: jest.fn(),
  cancelSubscription: jest.fn(),
  handleStripeWebhook: jest.fn(),
}));
jest.mock("../../models/user", () => ({ findById: jest.fn() }));

const paymentService = require("../../services/paymentService");
const User = require("../../models/user");
const paymentsRoute = require("../payments-route");

const app = express();
app.use("/api/payments", paymentsRoute); // the route applies express.raw to the webhook itself
app.use(express.json());

const ALICE = "64b000000000000000000001";
const auth = (userId) => ({
  Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" })}`,
});

beforeEach(() => jest.clearAllMocks());

describe("billing routes need a token", () => {
  test.each([
    "/api/payments/create-checkout-session",
    "/api/payments/create-customer-portal-session",
    "/api/payments/cancel-subscription",
  ])("POST %s without a token -> 401 and no service call", async (url) => {
    const res = await request(app).post(url).send({});
    expect(res.status).toBe(401);
    expect(paymentService.createCheckoutSession).not.toHaveBeenCalled();
    expect(paymentService.createCustomerPortalSession).not.toHaveBeenCalled();
    expect(paymentService.cancelSubscription).not.toHaveBeenCalled();
  });
});

describe("billing routes act on the token's user", () => {
  test("checkout uses the user id from the token", async () => {
    paymentService.createCheckoutSession.mockResolvedValue({ id: "cs_1" });
    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set(auth(ALICE))
      .send({ id: "someone-else" });
    expect(res.status).toBe(200);
    expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(ALICE);
  });

  test("portal uses the user id from the token", async () => {
    paymentService.createCustomerPortalSession.mockResolvedValue({ url: "https://stripe.test/p" });
    const res = await request(app).post("/api/payments/create-customer-portal-session").set(auth(ALICE));
    expect(res.status).toBe(200);
    expect(paymentService.createCustomerPortalSession).toHaveBeenCalledWith(ALICE);
  });

  test("cancel uses the user id from the token", async () => {
    paymentService.cancelSubscription.mockResolvedValue();
    User.findById.mockResolvedValue({ membershipStatus: "plus", cancellationPending: true });
    const res = await request(app).post("/api/payments/cancel-subscription").set(auth(ALICE));
    expect(res.status).toBe(200);
    expect(paymentService.cancelSubscription).toHaveBeenCalledWith(ALICE);
  });
});

describe("webhook stays public", () => {
  test("a bad signature gets 400 (verified by Stripe signature), not 401", async () => {
    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=1,v1=bad")
      .send(JSON.stringify({ type: "checkout.session.completed" }));
    expect(res.status).toBe(400);
    expect(paymentService.handleStripeWebhook).not.toHaveBeenCalled();
  });
});
