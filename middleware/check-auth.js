const jwt = require("jsonwebtoken");

const { pathToRegexp } = require("path-to-regexp");

const UNPROTECTED_ROUTES = [
  "/api/collection-feedback/createReviewForWidget",
  "/api/nps/calculatenps",
  "/api/users/register",
  "/api/users/login",
  "/api/users/resetPassword",
  "/api/widgets",
  "/api/users/:id/products/:pid/widgets/:wid/serve",
  "/api/payments/webhook",
  "/static/(.*)",
  "/",
];

const isUnprotectedRoute = (path) => {
  for (let route of UNPROTECTED_ROUTES) {
    const regex = pathToRegexp(route);
    if (regex.test(path)) {
      return true;
    }
  }
  return false;
};

module.exports = (req, res, next) => {
  console.log("Incoming Request Path:", req.path);
  if (isUnprotectedRoute(req.path) || req.method === "OPTIONS") {
    console.log("Bypassing token check");
    return next();
  }

  let token = null;

  if (req.headers.authorization) {
    try {
      token = req.headers.authorization.split(" ")[1];
    } catch (error) {
      console.error("Error extracting token from Authorization header:", error);
    }
  }
  if (!token) {
    console.error("Token error for path:", req.path);
    return res
      .status(401)
      .json({ message: "No token provided in the request." });
  }
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(401).json({ message: "Invalid token provided." });
  }
};
