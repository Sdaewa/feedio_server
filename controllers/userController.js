const { validationResult } = require("express-validator");

const userService = require("../services/userService");

exports.registerUser = async (req, res, next) => {
  const { name, email, password, company, termsAccepted } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const user = await userService.register({
      name,
      email,
      password,
      company,
      termsAccepted,
    });
    res.status(201).json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const user = await userService.login({ email, password });
    res.status(200).json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    await userService.updateUserMembershipStatus(id);
    const user = await userService.getById(id);
    res.status(200).json({ user: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.checkUserStatus = async (req, res) => {
  const { id } = req.params;

  try {
    await userService.updateUserMembershipStatus(id);
    const user = await userService.getById(id);
    res.status(200).json({ membershipStatus: user.membershipStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { name, email, password, notifyReview, notifyAccount } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const message = await userService.update({
      id,
      name,
      email,
      password,
      notifyReview,
      notifyAccount,
    });
    res.status(200).json({ message: message });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const result = await userService.requestPasswordReset(email);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);

    res.status(200).json({
      message:
        "If a user with this email exists, a password reset link has been sent.",
    });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Token and new password are required" });
  }

  try {
    const result = await userService.resetPassword(token, newPassword);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in resetPassword controller:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const message = await userService.deleteUser(id);
    res.status(200).json({ message: message });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
