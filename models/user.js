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
  notifyReview: { type: Boolean, default: false },
  notifyAccount: { type: Boolean, default: false },
  membershipStatus: { type: String, default: "free" },
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
});

module.exports = mongoose.model("User", userSchema);
