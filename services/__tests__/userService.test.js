const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const userService = require("../userService");
const User = require("../../models/user");
const Product = require("../../models/Product");
const Payment = require("../../models/Payment");
const Widget = require("../../models/Widget");
const { Review } = require("../../models/review");
const {
  sendPasswordResetEmail,
  sendAccountCreationEmail,
  sendAccountUpdateEmail,
} = require("../../utils/email");

jest.mock("bcrypt");
jest.mock("jsonwebtoken");
jest.mock("../../models/user");
jest.mock("../../models/Product");
jest.mock("../../models/Payment");
jest.mock("../../models/Widget");
jest.mock("../../models/review");
jest.mock("../../utils/email");

describe("User Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user", async () => {
      const mockUser = {
        _id: "user123",
        name: "Test User",
        email: "test@example.com",
        membershipStatus: "free",
        save: jest.fn(),
      };
      User.findOne.mockResolvedValue(null);
      User.mockImplementation(() => mockUser);
      bcrypt.hash.mockResolvedValue("hashedPassword");
      jwt.sign.mockReturnValue("token123");

      const result = await userService.register({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        company: "Test Company",
        termsAccepted: true,
      });

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
      expect(User).toHaveBeenCalledWith({
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword",
        company: "Test Company",
        termsAndConditions: true,
        notifyAccount: true,
        notifyReview: true,
      });
      expect(mockUser.save).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalled();
      expect(sendAccountCreationEmail).toHaveBeenCalled();
      expect(result).toEqual({
        userId: "user123",
        email: "test@example.com",
        name: "Test User",
        token: "token123",
        membershipStatus: "free",
      });
    });

    it("should throw an error if user already exists", async () => {
      User.findOne.mockResolvedValue({ email: "test@example.com" });

      await expect(
        userService.register({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
          company: "Test Company",
          termsAccepted: true,
        })
      ).rejects.toThrow("User already exists");
    });
  });

  describe("login", () => {
    it("should login a user with correct credentials", async () => {
      const mockUser = {
        _id: "user123",
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword",
        membershipStatus: "free",
        products: [],
      };
      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue("token123");

      const result = await userService.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashedPassword"
      );
      expect(jwt.sign).toHaveBeenCalled();
      expect(result).toEqual({
        userId: "user123",
        name: "Test User",
        email: "test@example.com",
        token: "token123",
        membershipStatus: "free",
        products: [],
      });
    });

    it("should throw an error if user does not exist", async () => {
      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(
        userService.login({
          email: "nonexistent@example.com",
          password: "password123",
        })
      ).rejects.toThrow("User doesn't exist");
    });

    it("should throw an error if password is invalid", async () => {
      const mockUser = {
        email: "test@example.com",
        password: "hashedPassword",
      };
      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        userService.login({
          email: "test@example.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow("Invalid password");
    });
  });

  describe("getById", () => {
    it("should return user by id", async () => {
      const mockUser = {
        _id: "user123",
        name: "Test User",
        email: "test@example.com",
        membershipStatus: "free",
        products: [],
        notifyAccount: true,
        notifyReview: true,
        trialEndsAt: null,
        membershipEndsAt: null,
        cancellationPending: false,
      };
      User.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userService.getById("user123");

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(result).toEqual({
        userId: "user123",
        name: "Test User",
        email: "test@example.com",
        membershipStatus: "free",
        products: [],
        notifyAccount: true,
        notifyReview: true,
        trialEndsAt: null,
        membershipEndsAt: null,
        cancellationPending: false,
      });
    });

    it("should throw an error if user is not found", async () => {
      User.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(userService.getById("nonexistentuser")).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("update", () => {
    it("should update user information", async () => {
      const mockUser = {
        _id: "user123",
        name: "Test User",
        email: "test@example.com",
        password: "oldHashedPassword",
        notifyAccount: true,
        notifyReview: true,
        save: jest.fn(),
      };
      User.findById.mockResolvedValue(mockUser);
      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("newHashedPassword");

      const result = await userService.update({
        id: "user123",
        name: "Updated User",
        email: "updated@example.com",
        password: "newpassword",
        notifyAccount: false,
        notifyReview: false,
      });

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(User.findOne).toHaveBeenCalledWith({
        email: "updated@example.com",
      });
      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword", 12);
      expect(mockUser.name).toBe("Updated User");
      expect(mockUser.email).toBe("updated@example.com");
      expect(mockUser.password).toBe("newHashedPassword");
      expect(mockUser.notifyAccount).toBe(false);
      expect(mockUser.notifyReview).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
      expect(sendAccountUpdateEmail).toHaveBeenCalled();
      expect(result).toEqual({ message: "User updated successfully" });
    });

    it("should throw an error if user is not found", async () => {
      User.findById.mockResolvedValue(null);

      await expect(
        userService.update({
          id: "nonexistentuser",
          name: "Updated User",
        })
      ).rejects.toThrow("User not found");
    });

    it("should throw an error if email is already in use", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
      };
      const existingUser = {
        _id: "user456",
        email: "existing@example.com",
      };
      User.findById.mockResolvedValue(mockUser);
      User.findOne.mockResolvedValue(existingUser);

      await expect(
        userService.update({
          id: "user123",
          email: "existing@example.com",
        })
      ).rejects.toThrow("Email already in use");
    });
  });

  describe("requestPasswordReset", () => {
    it("should create a password reset token", async () => {
      const mockUser = {
        email: "test@example.com",
        save: jest.fn(),
      };
      User.findOne.mockResolvedValue(mockUser);

      const result = await userService.requestPasswordReset("test@example.com");

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(mockUser.resetPasswordToken).toBeDefined();
      expect(mockUser.resetPasswordExpires).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(sendPasswordResetEmail).toHaveBeenCalled();
      expect(result).toEqual({
        message:
          "If a user with this email exists, a password reset link has been sent.",
      });
    });

    it("should return a generic message if user is not found", async () => {
      User.findOne.mockResolvedValue(null);

      const result = await userService.requestPasswordReset(
        "nonexistent@example.com"
      );

      expect(result).toEqual({
        message:
          "If a user with this email exists, a password reset link has been sent.",
      });
    });
  });

  describe("resetPassword", () => {
    it("should reset user password", async () => {
      const mockUser = {
        resetPasswordToken: "validtoken",
        resetPasswordExpires: Date.now() + 3600000,
        save: jest.fn(),
      };
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.hash.mockResolvedValue("newHashedPassword");

      const result = await userService.resetPassword(
        "validtoken",
        "newpassword"
      );

      expect(User.findOne).toHaveBeenCalledWith({
        resetPasswordToken: "validtoken",
        resetPasswordExpires: { $gt: expect.any(Number) },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword", 12);
      expect(mockUser.password).toBe("newHashedPassword");
      expect(mockUser.resetPasswordToken).toBeUndefined();
      expect(mockUser.resetPasswordExpires).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: "Password has been reset successfully",
      });
    });

    it("should throw an error if token is invalid or expired", async () => {
      User.findOne.mockResolvedValue(null);

      await expect(
        userService.resetPassword("invalidtoken", "newpassword")
      ).rejects.toThrow("Invalid or expired password reset token");
    });
  });

  describe("deleteUser", () => {
    it("should delete user and associated data", async () => {
      const mockUser = {
        _id: "user123",
        products: ["product1", "product2"],
      };
      User.findById.mockResolvedValue(mockUser);

      const result = await userService.deleteUser("user123");

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(Review.deleteMany).toHaveBeenCalled();
      expect(Widget.deleteMany).toHaveBeenCalled();
      expect(Product.deleteMany).toHaveBeenCalled();
      expect(Payment.deleteMany).toHaveBeenCalledWith({ user: "user123" });
      expect(User.deleteOne).toHaveBeenCalledWith({ _id: "user123" });
      expect(result).toEqual({
        message: "User and associated data deleted successfully",
      });
    });

    it("should throw an error if user is not found", async () => {
      User.findById.mockResolvedValue(null);

      await expect(userService.deleteUser("nonexistentuser")).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("updateUserMembershipStatus", () => {
    it("should update membership status when trial ends", async () => {
      const mockUser = {
        trialEndsAt: new Date(Date.now() - 1000),
        cancellationPending: true,
        save: jest.fn(),
      };
      User.findById.mockResolvedValue(mockUser);

      await userService.updateUserMembershipStatus("user123");

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(mockUser.membershipStatus).toBe("free");
      expect(mockUser.trialEndsAt).toBeNull();
      expect(mockUser.cancellationPending).toBe(false);
      expect(mockUser.stripeSubscriptionId).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should update membership status when membership ends", async () => {
      const mockUser = {
        membershipEndsAt: new Date(Date.now() - 1000),
        save: jest.fn(),
      };
      User.findById.mockResolvedValue(mockUser);

      await userService.updateUserMembershipStatus("user123");

      expect(mockUser.membershipStatus).toBe("free");
      expect(mockUser.membershipEndsAt).toBeNull();
      expect(mockUser.cancellationPending).toBe(false);
      expect(mockUser.stripeSubscriptionId).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should not update membership status if trial or membership is still active", async () => {
      const mockUser = {
        trialEndsAt: new Date(Date.now() + 1000000),
        membershipEndsAt: new Date(Date.now() + 1000000),
        save: jest.fn(),
      };
      User.findById.mockResolvedValue(mockUser);

      await userService.updateUserMembershipStatus("user123");

      expect(mockUser.membershipStatus).toBeUndefined();
      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it("should do nothing if user is not found", async () => {
      User.findById.mockResolvedValue(null);

      await userService.updateUserMembershipStatus("nonexistentuser");

      expect(User.findById).toHaveBeenCalledWith("nonexistentuser");
    });
  });
});
