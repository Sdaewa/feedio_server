const express = require("express");
const { check } = require("express-validator");

const productController = require("../controllers/productController");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

// Public routes should come first
router.get("/all", productController.getAllProducts);

// Protect routes that need authentication
router.use(checkAuth);

router.post(
  "/createProduct",
  [
    check("name").not().isEmpty().withMessage("Product name is required"),
    check("header").not().isEmpty().withMessage("Header is required"),
    check("content").not().isEmpty().withMessage("Content is required"),
    check("questions").isArray().withMessage("Questions must be an array"),
  ],
  productController.createProduct
);

// Parameter routes should come last
router.get("/:productId", productController.getProductById);

router.put(
  "/:productId",
  [
    check("name")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Product name must not be empty"),
    check("header")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Header must not be empty"),
    check("content")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Content must not be empty"),
    check("questions")
      .optional()
      .isArray()
      .withMessage("Questions must be an array"),
  ],
  productController.updateProduct
);

router.delete("/:productId", productController.deleteProduct);

module.exports = router;
