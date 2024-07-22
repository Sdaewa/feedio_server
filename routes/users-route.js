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
  "/request-password-reset",
  [check("email").isEmail().withMessage("Please enter a valid email")],
  userController.requestPasswordReset
);

router.post(
  "/reset-password",
  [
    check("token").not().isEmpty().withMessage("Token is required"),
    check("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
  ],
  userController.resetPassword
);

router.delete("/:id", userController.deleteUser);

router.get("/:id/check-status", userController.checkUserStatus);

module.exports = router;
