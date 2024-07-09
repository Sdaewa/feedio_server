const express = require("express");
const { check } = require("express-validator");

const router = express.Router();

const userController = require("../controllers/userController");

router.post(
  "/register",
  [
    check("name")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Name must not be empty"),
    check("email").isEmail().withMessage("Please enter a valid email"),
    check("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 5 characters long"),
  ],
  userController.registerUser
);

router.post(
  "/login",
  [
    check("email").isEmail().withMessage("Please enter a valid email"),
    check("password").exists().withMessage("Password is required"),
  ],
  userController.loginUser
);

router.get("/:id", userController.getUserById);

router.put(
  "/:id",
  [
    check("name")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Name must not be empty"),
    check("email")
      .optional()
      .isEmail()
      .withMessage("Please enter a valid email"),
  ],
  userController.updateUser
);

router.post(
  "/resetPassword",
  [check("email").isEmail().withMessage("Please enter a valid email")],
  userController.resetPassword
);

router.delete("/:id", userController.deleteUser);

module.exports = router;
