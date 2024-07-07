const express = require("express");
const router = express.Router();
const npsController = require("../controllers/npsController");

router.post("/submitScore", npsController.submitNpsScore);
router.get("/getNpsTrends/:productId", npsController.getNPSTrends);
router.get(
  "/getNpsScoreDistribution/:productId",
  npsController.getNpsScoreDistribution
);
router.post("/getResponseRate/:productId", npsController.getResponseRate);
router.get("/getProductMetrics/:productId", npsController.getProductMetrics);

module.exports = router;
