const express = require("express");
const widgetController = require("../controllers/widgetController");
const checkAuth = require("../middleware/check-auth");
const {
  requireProductOwner,
  requireWidgetOwner,
} = require("../middleware/ownership");

const router = express.Router();

// checkAuth is applied per route, not with router.use: its public-path list
// contains "/", which would let GET /api/widgets/ through without a token.
// The ownership middleware also fails closed (401) if it ever happens.

router.get(
  "/",
  checkAuth,
  requireProductOwner((req) => req.query.productId),
  widgetController.getWidgets
);

router.post(
  "/config",
  checkAuth,
  requireProductOwner((req) => req.body.productId),
  widgetController.generateWidget
);

// Public on purpose: customers embed this on their own websites.
router.get("/:wid/serve", widgetController.serveWidget);

router.get(
  "/:wid",
  checkAuth,
  requireWidgetOwner((req) => req.params.wid),
  widgetController.getWidget
);

router.delete(
  "/:wid",
  checkAuth,
  requireWidgetOwner((req) => req.params.wid),
  widgetController.deleteWidget
);

module.exports = router;
