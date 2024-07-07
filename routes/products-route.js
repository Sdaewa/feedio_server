const express = require("express");
const { check } = require("express-validator");

const productController = require("../controllers/productController");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/all", productController.getAllProducts);

router.post(
  "/createProduct",
  [
    check("name").not().isEmpty().withMessage("Product name is required"),
    // check("imageUrl").not().isEmpty().withMessage("Image URL is required"),
    check("header").not().isEmpty().withMessage("Header is required"),
    check("content").not().isEmpty().withMessage("Content is required"),
    check("questions").isArray().withMessage("Questions must be an array"),
  ],
  productController.createProduct
);

router.get("/:pid", productController.getProductById);

router.put(
  "/:pid",
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

router.delete("/:pid", productController.deleteProduct);

module.exports = router;
