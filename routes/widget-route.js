const express = require("express");
const widgetController = require("../controllers/widgetController");

const router = express.Router();

router.get("/", widgetController.getWidgets);
router.post("/config", widgetController.generateWidget);
router.get("/:wid/serve", widgetController.serveWidget);
router.get("/:wid", widgetController.getWidget);
router.delete("/:wid", widgetController.deleteWidget);

module.exports = router;
