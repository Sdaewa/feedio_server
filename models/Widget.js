const mongoose = require("mongoose");

const widgetSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "masonry_scroll",
        "masonry_fix",
        "carousel",
        "average_card",
        "collect-feedback",
      ],
      required: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
    },
    scrollSpeed: {
      type: Number,
    },
    hideDate: {
      type: Boolean,
      default: false,
    },
    autoScroll: {
      type: Boolean,
      default: false,
    },
    backgroundColor: {
      type: String,
    },
    textColor: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Widget = mongoose.model("Widget", widgetSchema);

module.exports = Widget;
