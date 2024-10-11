const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const mongoose = require("mongoose");

const Widget = require("../models/Widget");
const { Review } = require("../models/review");
const Product = require("../models/Product");

const generateWidgetConfig = async (
  productId,
  scrollSpeed,
  hideDate,
  type,
  autoScroll,
  background,
  text,
  embedLocation
) => {
  let widget = await Widget.findOne({
    productId,
    type,
  });

  if (widget) {
    widget.scrollSpeed = scrollSpeed;
    widget.hideDate = hideDate;
    widget.type = type;
    widget.autoScroll = autoScroll;
    widget.backgroundColor = background;
    widget.textColor = text;
    widget.location = embedLocation;
  } else {
    widget = new Widget({
      product: productId,
      scrollSpeed: scrollSpeed,
      hideDate: hideDate,
      type: type,
      autoScroll: autoScroll,
      backgroundColor: background,
      textColor: text,
      location: embedLocation,
    });
  }
  await widget.save();

  const product = await Product.findById(productId);
  product.widgets.push(widget._id);
  await product.save();

  return widget;
};

const getWidgets = async (productId) => {
  const productObjectId = new mongoose.Types.ObjectId(productId);

  try {
    const widgets = await Widget.find({ product: productObjectId });

    return widgets;
  } catch (error) {
    console.error("Error fetching widgets:", error);
    throw error;
  }
};

const getWidgetConfig = async (widgetId, productId) => {
  const widgetObjectId = new mongoose.Types.ObjectId(widgetId);
  const productObjectId = new mongoose.Types.ObjectId(productId);

  try {
    const widget = await Widget.findOne({
      _id: widgetObjectId,
      product: productObjectId,
    });

    return widget;
  } catch (error) {
    console.error("Error fetching widget config:", error);
    throw error;
  }
};

const generateWidgetRepresentation = async (
  productId,
  scrollSpeed,
  hideDate,
  type,
  autoScroll,
  background,
  text
) => {
  let widgetRepresentation;
  let templatePath;
  let templateString;
  let stylePath;
  let scriptPath;

  const reviews = await Review.find({ product: productId, status: "fav" });

  const reviewsData = reviews.map((review) => ({
    name: review.name,
    content: review.feedback,
    rating: review.rating,
    createdAt: new Date(review.createdAt).toDateString(),
  }));

  const reviewsLength = reviewsData.length;

  const product = await Product.findById(productId);

  const productData = {
    name: product.name,
    header: product.header,
    content: product.content,
    questions: product.questions,
    averageRating: product.averageRating,
  };
  const itemsPerView = 3;

  switch (type) {
    case "masonry_scroll":
      templatePath = path.join(
        __dirname,
        "../public/widgetTemplates/masonry-scroll.hbs"
      );
      stylePath = path.join(__dirname, "../public/styles/masonry-scroll.css");
      scriptPath = path.join(__dirname, "../public/scripts/masonry-scroll.js");
      break;

    case "masonry_fix":
      templatePath = path.join(
        __dirname,
        "../public/widgetTemplates/masonry-fix.hbs"
      );
      stylePath = path.join(__dirname, "../public/styles/masonry-fix.css");

      break;

    case "carousel":
      templatePath = path.join(
        __dirname,
        "../public/widgetTemplates/carousel.hbs"
      );
      stylePath = path.join(__dirname, "../public/styles/carousel.css");
      scriptPath = path.join(__dirname, "../public/scripts/slide.js");
      break;

    case "average_card":
      templatePath = path.join(
        __dirname,
        "../public/widgetTemplates/average-card.hbs"
      );
      stylePath = path.join(__dirname, "../public/styles/average-card.css");

      break;

    case "collect-feedback":
      templatePath = path.join(
        __dirname,
        "../public/widgetTemplates/collect-feedback.hbs"
      );
      stylePath = path.join(__dirname, "../public/styles/collect-feedback.css");
      scriptPath = path.join(__dirname, "../public/scripts/sendForm.js");
      break;

    default:
      throw new Error("Invalid widget type");
  }

  handlebars.registerHelper("repeat", function (n, value) {
    let ret = "";
    let i = 0;

    if (arguments.length === 3) {
      i = value;
      n = n - value;
    }

    return ret;
  });

  handlebars.registerHelper("times", function (n, block) {
    var accum = "";
    for (var i = 0; i < n; ++i) accum += block.fn(i);
    return accum;
  });

  handlebars.registerHelper("range", function (start, end) {
    var rangeArray = [];
    for (var i = start; i < end; ++i) {
      rangeArray.push(i);
    }
    return rangeArray;
  });

  handlebars.registerHelper("lte", function (value1, value2, options) {
    return value1 <= value2;
  });

  handlebars.registerHelper("toFixed", function (number, digits) {
    return number.toFixed(digits);
  });

  handlebars.registerHelper("formatDate", function (date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  handlebars.registerHelper("multiply", function (a, b) {
    return a * b;
  });

  handlebars.registerHelper("subtract", function (a, b) {
    return a - b;
  });

  handlebars.registerHelper("lte", function (a, b) {
    return a < b;
  });

  try {
    templateString = fs.readFileSync(templatePath, "utf-8");

    const template = handlebars.compile(templateString);
    const styleContent = fs.readFileSync(stylePath, "utf-8");

    widgetRepresentation = template({
      reviewsData,
      reviewsLength,
      productData,
      productId,
      itemsPerView,
      scrollSpeed,
      hideDate,
      type,
      autoScroll,
      background,
      text,
      scrollSpeed: scrollSpeed || "0.5",
    });

    widgetRepresentation += `<style>${styleContent}</style>`;

    if (scriptPath) {
      const scriptContent = fs.readFileSync(scriptPath, "utf-8");
      widgetRepresentation += `<script>${scriptContent}</script>`;

      widgetRepresentation += `<script>document.addEventListener('DOMContentLoaded', function() { const carousel = document.querySelector('.widget.carousel'); if (carousel) { initCarousel(carousel); } });</script>`;
    }
  } catch (error) {
    console.error("Error compiling the Handlebars template:", error);
  }

  return widgetRepresentation;
};

const deleteWidget = async (widgetId) => {
  try {
    const widget = await Widget.findById(widgetId);
    if (!widget) {
      throw new Error("Widget not found");
    }

    const productId = widget.product;
    await Product.findByIdAndUpdate(
      productId,
      { $pull: { widgets: widgetId } },
      { new: true }
    );

    await Widget.findByIdAndDelete(widgetId);
  } catch (error) {
    console.error("Error deleting widget:", error);
    throw error;
  }
};

module.exports = {
  generateWidgetConfig,
  getWidgets,
  getWidgetConfig,
  generateWidgetRepresentation,
  deleteWidget,
};
