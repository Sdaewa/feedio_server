const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  invoiceId: String,
  amount: Number,
  status: String,
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  company: { type: String },
  termsAndConditions: { type: Boolean, default: false, required: true },
  notifyReview: { type: Boolean, default: false },
  notifyAccount: { type: Boolean, default: false },
  membershipStatus: { type: String, enum: ["free", "plus"], default: "free" },
  trialEndsAt: Date,
  membershipEndsAt: Date,
  cancellationPending: { type: Boolean, default: false },
  stripeSubscriptionId: { type: String },
  stripeCustomerId: { type: String },
  billingAddress: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
  },
  paymentMethodDetails: {
    cardType: { type: String },
    lastFourDigits: { type: String },
    expirationDate: { type: String },
  },
  defaultPaymentMethod: { type: String },
  invoices: [invoiceSchema],
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});

module.exports = mongoose.model("User", userSchema);
