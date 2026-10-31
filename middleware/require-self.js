const { AppError } = require("./error-handler");

// Authorization (not authentication): the token owner may only act on their own
// account. Run after check-auth, which sets req.userData from the verified JWT.
module.exports = (req, res, next) => {
  const tokenUserId = req.userData && String(req.userData.userId);

  if (!tokenUserId || tokenUserId !== String(req.params.id)) {
    return next(new AppError(403, "You can only access your own account"));
  }

  next();
};
