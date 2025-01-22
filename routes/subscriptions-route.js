const express = require("express");
const { check } = require("express-validator");
const { validateRequest } = require("../middleware/validate-request");
const { requireAuth } = require("../middleware/require-auth");

const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");

/**
 * @swagger
 * /api/subscriptions/create-checkout-session:
 *   post:
 *     tags:
 *       - Subscriptions
 *     summary: Create checkout session
 *     description: Create a Stripe checkout session for subscription purchase
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Stripe Price ID for the subscription plan
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   description: Stripe Checkout Session ID
 *                 url:
 *                   type: string
 *                   description: Checkout session URL
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  "/create-checkout-session",
  requireAuth,
  validateRequest([
    check("priceId").notEmpty().withMessage("Price ID is required"),
  ]),
  subscriptionController.createCheckoutSession
);

/**
 * @swagger
 * /api/subscriptions/webhook:
 *   post:
 *     tags:
 *       - Subscriptions
 *     summary: Stripe webhook
 *     description: Handle Stripe webhook events for subscription management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook handled successfully
 *       400:
 *         description: Invalid webhook signature
 */
router.post("/webhook", subscriptionController.handleWebhook);

/**
 * @swagger
 * /api/subscriptions/portal:
 *   post:
 *     tags:
 *       - Subscriptions
 *     summary: Create customer portal session
 *     description: Create a Stripe customer portal session for subscription management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portal session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Customer portal URL
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post("/portal", requireAuth, subscriptionController.createPortalSession);

/**
 * @swagger
 * /api/subscriptions/status:
 *   get:
 *     tags:
 *       - Subscriptions
 *     summary: Get subscription status
 *     description: Get the current user's subscription status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscription'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/status", requireAuth, subscriptionController.getSubscriptionStatus);

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     tags:
 *       - Subscriptions
 *     summary: Get subscription plans
 *     description: Get available subscription plans
 *     responses:
 *       200:
 *         description: Subscription plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Plan'
 */
router.get("/plans", subscriptionController.getSubscriptionPlans);

module.exports = router; 