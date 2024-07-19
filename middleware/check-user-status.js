const userService = require("../services/userService");

const checkUserStatus = async (req, res, next) => {
  if (req.user && req.user.id) {
    await userService.updateUserMembershipStatus(req.user.id);
  }
  next();
};

module.exports = checkUserStatus;
