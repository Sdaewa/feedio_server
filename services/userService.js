const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const crypto = require("crypto");
const {
  sendPasswordResetEmail,
  sendAccountCreationEmail,
  sendAccountUpdateEmail,
} = require("../utils/email");
const User = require("../models/user");
const Product = require("../models/Product");
const Payment = require("../models/Payment");
const Widget = require("../models/Widget");
const { Review } = require("../models/review");

dotenv.config();

const register = async ({ name, email, password, company, termsAccepted }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    company,
    termsAndConditions: termsAccepted,
    notifyAccount: true,
    notifyReview: true,
  });
  await newUser.save();

  const token = jwt.sign(
    { userId: newUser._id, email: newUser.email },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  sendAccountCreationEmail({
    name: newUser.name,
    email: newUser.email,
    membershipStatus: newUser.membershipStatus,
  });

  return {
    userId: newUser._id,
    email: newUser.email,
    name: newUser.name,
    token,
    membershipStatus: newUser.membershipStatus,
  };
};

const login = async ({ email, password }) => {
  const existingUser = await User.findOne({ email }).populate("products");
  if (!existingUser) {
    throw new Error("User doesn't exist");
  }

  const isPasswordValid = await bcrypt.compare(password, existingUser.password);
  if (!isPasswordValid) {
    throw new Error("Invalid password");
  }

  const token = jwt.sign(
    { userId: existingUser._id, email: existingUser.email },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  return {
    userId: existingUser._id,
    name: existingUser.name,
    email: existingUser.email,
    token,
    membershipStatus: existingUser.membershipStatus,
    products: existingUser.products,
  };
};

const getById = async (id) => {
  const user = await User.findById(id).populate("products");
  if (!user) {
    throw new Error("User not found");
  }

  return {
    userId: user._id,
    name: user.name,
    email: user.email,
    membershipStatus: user.membershipStatus,
    products: user.products,
    notifyAccount: user.notifyAccount,
    notifyReview: user.notifyReview,
    trialEndsAt: user.trialEndsAt,
    membershipEndsAt: user.membershipEndsAt,
    cancellationPending: user.cancellationPending,
  };
};

const update = async ({
  id,
  name,
  email,
  password,
  notifyAccount,
  notifyReview,
}) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error("User not found");
  }

  let emailUpdated = false;
  let passwordUpdated = false;

  if (name && name !== user.name) {
    user.name = name;
  }

  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== id) {
      throw new Error("Email already in use");
    }
    user.email = email;
    emailUpdated = true;
  }

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    passwordUpdated = true;
  }

  if (typeof notifyAccount !== "undefined") {
    user.notifyAccount = notifyAccount;
  }
  if (typeof notifyReview !== "undefined") {
    user.notifyReview = notifyReview;
  }

  await user.save();

  if (user.notifyAccount) {
    sendAccountUpdateEmail(user, { emailUpdated, passwordUpdated });
  }

  return { message: "User updated successfully" };
};

const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    return {
      message:
        "If a user with this email exists, a password reset link has been sent.",
    };
  }

  const resetPasswordToken = crypto.randomBytes(32).toString("hex");
  const resetPasswordExpires = Date.now() + 3600000;

  user.resetPasswordToken = resetPasswordToken;
  user.resetPasswordExpires = resetPasswordExpires;

  try {
    await user.save();
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetPasswordToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    return {
      message:
        "If a user with this email exists, a password reset link has been sent.",
    };
  } catch (error) {
    throw new Error("Failed to process password reset request");
  }
};

const resetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw new Error("Token and new password are required");
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new Error("Invalid or expired password reset token");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  return { message: "Password has been reset successfully" };
};

const deleteUser = async (id) => {
  const user = await User.findById(id);

  if (!user) {
    throw new Error("User not found");
  }

  const productIds = user.products.map(
    (product) => new mongoose.Types.ObjectId(product)
  );

  await Review.deleteMany({ product: { $in: productIds } });
  await Widget.deleteMany({ product: { $in: productIds } });
  await Product.deleteMany({ _id: { $in: productIds } });
  await Payment.deleteMany({ user: id });
  await User.deleteOne({ _id: id });

  return { message: "User and associated data deleted successfully" };
};

const updateUserMembershipStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return;

  const now = new Date();

  if (user.trialEndsAt && now > user.trialEndsAt) {
    if (user.cancellationPending) {
      user.membershipStatus = "free";
      user.trialEndsAt = null;
      user.cancellationPending = false;
      user.stripeSubscriptionId = null;
    } else {
      user.trialEndsAt = null;
    }
  } else if (user.membershipEndsAt && now > user.membershipEndsAt) {
    user.membershipStatus = "free";
    user.membershipEndsAt = null;
    user.cancellationPending = false;
    user.stripeSubscriptionId = null;
  }

  await user.save();
};

module.exports = {
  register,
  login,
  getById,
  update,
  requestPasswordReset,
  resetPassword,
  deleteUser,
  updateUserMembershipStatus,
};
