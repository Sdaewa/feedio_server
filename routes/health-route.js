const express = require("express");
const router = express.Router();
const healthController = require("../controllers/healthController");

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Basic health check
 *     description: Get basic health status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy]
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/health", healthController.basicCheck);

/**
 * @swagger
 * /api/v1/health/detailed:
 *   get:
 *     tags:
 *       - Health
 *     summary: Detailed health check
 *     description: Get detailed health status of all system components
 *     responses:
 *       200:
 *         description: Detailed health status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 */
router.get("/health/detailed", healthController.detailedCheck);

module.exports = router; 