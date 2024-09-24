const mongoose = require("mongoose");
const { LanguageServiceClient } = require("@google-cloud/language");
const natural = require("natural");
const reviewService = require("../reviewService");
const User = require("../../models/user");
const { Review } = require("../../models/review");
const Product = require("../../models/Product");
const { calculateNetPromoterScore } = require("../../utils/nps");
const { sendEmail, sendAdminNotificationEmail } = require("../../utils/email");

jest.mock("@google-cloud/language");
jest.mock("natural");
jest.mock("../../models/user");
jest.mock("../../models/review");
jest.mock("../../models/Product");
jest.mock("../../utils/nps");
jest.mock("../../utils/email");

describe("Review Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("analyzeReviewContent", () => {
    it("should return default values for short feedback", async () => {
      const result = await reviewService.analyzeReviewContent("Short");
      expect(result).toEqual({
        overallSentiment: { score: 0, magnitude: 0 },
        sentenceSentiments: [],
        entitySentiments: [],
        categories: [],
      });
    });

    it("should analyze longer feedback", async () => {
      const mockClient = {
        analyzeSentiment: jest.fn().mockResolvedValue([
          {
            documentSentiment: { score: 0.8, magnitude: 0.9 },
            sentences: [
              {
                text: { content: "Great product" },
                sentiment: { score: 0.8, magnitude: 0.9 },
              },
            ],
          },
        ]),
        analyzeEntitySentiment: jest.fn().mockResolvedValue([
          {
            entities: [
              {
                name: "product",
                type: "CONSUMER_GOOD",
                salience: 0.5,
                sentiment: { score: 0.8, magnitude: 0.9 },
              },
            ],
          },
        ]),
        classifyText: jest.fn().mockResolvedValue([
          {
            categories: [{ name: "Shopping", confidence: 0.9 }],
          },
        ]),
      };
      LanguageServiceClient.mockImplementation(() => mockClient);

      const result = await reviewService.analyzeReviewContent(
        "This is a great product. I love it!"
      );
      expect(result.overallSentiment).toEqual({ score: 0.8, magnitude: 0.9 });
      expect(result.sentenceSentiments).toHaveLength(1);
      expect(result.entitySentiments).toHaveLength(1);
      expect(result.categories).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("should create a new review", async () => {
      const mockProduct = {
        _id: "product123",
        user: "user123",
        name: "Test Product",
        reviews: [],
        save: jest.fn(),
      };
      const mockUser = {
        _id: "user123",
        notifyReview: true,
        email: "user@example.com",
      };
      const mockReview = { _id: "review123", save: jest.fn() };

      Product.findById.mockResolvedValue(mockProduct);
      User.findById.mockResolvedValue(mockUser);
      Review.mockImplementation(() => mockReview);

      const result = await reviewService.create({
        name: "John",
        email: "john@example.com",
        feedback: "Great product!",
        rating: 5,
        productId: "product123",
        npsScore: 9,
      });

      expect(Product.findById).toHaveBeenCalledWith("product123");
      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(Review).toHaveBeenCalled();
      expect(mockReview.save).toHaveBeenCalled();
      expect(mockProduct.reviews.push).toHaveBeenCalledWith("review123");
      expect(mockProduct.save).toHaveBeenCalled();
      expect(sendAdminNotificationEmail).toHaveBeenCalled();
      expect(result).toEqual(mockReview);
    });

    it("should throw an error if product is not found", async () => {
      Product.findById.mockResolvedValue(null);

      await expect(
        reviewService.create({
          name: "John",
          email: "john@example.com",
          feedback: "Great product!",
          rating: 5,
          productId: "nonexistent",
          npsScore: 9,
        })
      ).rejects.toThrow("Product not found");
    });
  });

  describe("widgetReview", () => {
    it("should create a new review from widget", async () => {
      const mockProduct = {
        _id: "product123",
        user: "user123",
        name: "Test Product",
        reviews: [],
        save: jest.fn(),
      };
      const mockUser = { _id: "user123", email: "user@example.com" };
      const mockReview = { _id: "review123", save: jest.fn() };

      Product.findById.mockResolvedValue(mockProduct);
      User.findById.mockResolvedValue(mockUser);
      Review.mockImplementation(() => mockReview);

      const result = await reviewService.widgetReview({
        name: "John",
        email: "john@example.com",
        feedback: "Great product!",
        rating: 5,
        productId: "product123",
        npsScore: 9,
      });

      expect(Product.findById).toHaveBeenCalledWith("product123");
      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(Review).toHaveBeenCalled();
      expect(mockReview.save).toHaveBeenCalled();
      expect(mockProduct.reviews.push).toHaveBeenCalledWith("review123");
      expect(mockProduct.save).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
      expect(result).toEqual(mockReview);
    });
  });

  describe("getAll", () => {
    it("should get all reviews for a product", async () => {
      const mockProduct = {
        _id: "product123",
        reviews: [{ _id: "review1" }, { _id: "review2" }],
      };
      Product.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await reviewService.getAll("product123");

      expect(Product.findById).toHaveBeenCalledWith("product123");
      expect(result).toEqual(mockProduct.reviews);
    });

    it("should filter reviews by status if provided", async () => {
      const mockProduct = {
        _id: "product123",
        reviews: [
          { _id: "review1", status: "fav" },
          { _id: "review2", status: "unfav" },
        ],
      };
      Product.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await reviewService.getAll("product123", "fav");

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe("review1");
    });
  });

  describe("deleteOne", () => {
    it("should delete a review", async () => {
      const mockReview = { _id: "review123", product: "product123" };
      const mockProduct = {
        _id: "product123",
        reviews: ["review123"],
        save: jest.fn(),
      };

      Review.findById.mockResolvedValue(mockReview);
      Product.findById.mockResolvedValue(mockProduct);
      Review.deleteOne.mockResolvedValue({});

      const result = await reviewService.deleteOne("review123");

      expect(Review.findById).toHaveBeenCalledWith("review123");
      expect(Product.findById).toHaveBeenCalledWith("product123");
      expect(mockProduct.reviews).not.toContain("review123");
      expect(mockProduct.save).toHaveBeenCalled();
      expect(Review.deleteOne).toHaveBeenCalledWith({ _id: "review123" });
      expect(result).toBe("Review deleted successfully");
    });
  });

  describe("updateFavoriteStatus", () => {
    it("should toggle favorite status of a review", async () => {
      const mockReview = { _id: "review123", status: "unfav", save: jest.fn() };
      Review.findById.mockResolvedValue(mockReview);

      const result = await reviewService.updateFavoriteStatus("review123");

      expect(Review.findById).toHaveBeenCalledWith("review123");
      expect(mockReview.status).toBe("fav");
      expect(mockReview.save).toHaveBeenCalled();
      expect(result.message).toBe("Review status updated to fav");
    });
  });

  describe("getWordCloudData", () => {
    it("should generate word frequencies", async () => {
      const mockReviews = [
        { tokens: ["great", "product", "love", "it"] },
        { tokens: ["awesome", "product", "highly", "recommend"] },
      ];
      Review.find.mockResolvedValue(mockReviews);

      const result = await reviewService.getWordCloudData("product123");

      expect(Review.find).toHaveBeenCalledWith({ product: "product123" });
      expect(result).toHaveLength(5);
      expect(result[0].name).toBe("product");
      expect(result[0].count).toBe(2);
    });
  });

  describe("getRatingsTrend", () => {
    it("should get ratings trend for a product", async () => {
      const mockTrends = [
        { _id: { year: 2023, month: 5, day: 1 }, averageRating: 4.5, count: 2 },
        { _id: { year: 2023, month: 5, day: 2 }, averageRating: 4.0, count: 1 },
      ];
      Review.aggregate.mockResolvedValue(mockTrends);

      const result = await reviewService.getRatingsTrend(
        "product123",
        "2023-05-01",
        "2023-05-02"
      );

      expect(Review.aggregate).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]._id.day).toBe(1);
      expect(result[1]._id.day).toBe(2);
    });
  });
});
