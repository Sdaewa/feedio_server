const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

const userRoutes = require("./routes/users-route");
const productRoutes = require("./routes/products-route");
const reviewRoutes = require("./routes/reviews-route");
const paymentRoutes = require("./routes/payments-route");
const paymentController = require("./controllers/paymentController");
const widgetRoutes = require("./routes/widget-route");
const checkAuth = require("./middleware/check-auth");

const app = express();
const envPath = path.join(__dirname, ".env");

dotenv.config({ path: envPath });

app.use(cors());

app.use(
  bodyParser.json({
    verify: function (req, res, buf) {
      req.rawBody = buf.toString();
    },
  })
);

app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

app.use(checkAuth);

app.use("/static", express.static(path.join(__dirname, "public")));

app.use("/api/users", userRoutes);

app.use("/api/users/:id/products", productRoutes);

app.use(
  "/api/users/:id/products/:pid/reviews",
  (req, res, next) => {
    req.mainParams = req.params;
    next();
  },
  reviewRoutes
);

app.use(
  "/api/users/:id/products/:pid/widgets",
  (req, res, next) => {
    req.mainParams = req.params;
    next();
  },
  widgetRoutes
);

app.use("/api/users/:id/payments", paymentRoutes);

app.use("/api/payments/", paymentController.handleStripeWebhook);

app.use("/api/collection-feedback", reviewRoutes);

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);
