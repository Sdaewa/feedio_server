const mongoose = require("mongoose");
const productService = require("../productService");
const Product = require("../../models/Product");
const User = require("../../models/user");
const { Review } = require("../../models/review");

jest.mock("mongoose");
jest.mock("../../models/Product");
jest.mock("../../models/user");
jest.mock("../../models/review");

describe("Product Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new product", async () => {
      const mockUser = { _id: "user123", products: [], save: jest.fn() };
      const mockProduct = { _id: "product123", save: jest.fn() };

      User.findById.mockResolvedValue(mockUser);
      Product.mockImplementation(() => mockProduct);

      const result = await productService.create({
        name: "Test Product",
        header: "Test Header",
        content: "Test Content",
        questions: ["Question 1"],
        userId: "user123",
      });

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(Product).toHaveBeenCalledWith({
        name: "Test Product",
        header: "Test Header",
        content: "Test Content",
        questions: ["Question 1"],
        user: "user123",
      });
      expect(mockProduct.save).toHaveBeenCalled();
      expect(mockUser.products.push).toHaveBeenCalledWith(mockProduct);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it("should throw an error if user is not found", async () => {
      User.findById.mockResolvedValue(null);

      await expect(
        productService.create({
          name: "Test Product",
          header: "Test Header",
          content: "Test Content",
          questions: ["Question 1"],
          userId: "nonexistentuser",
        })
      ).rejects.toThrow("User not found");
    });
  });

  describe("getAll", () => {
    it("should get all products for a user", async () => {
      const mockUser = { _id: "user123" };
      const mockProducts = [{ _id: "product1" }, { _id: "product2" }];

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      User.findById.mockResolvedValue(mockUser);
      Product.find.mockResolvedValue(mockProducts);

      const result = await productService.getAll("user123");

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith("user123");
      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(Product.find).toHaveBeenCalledWith({ user: "user123" });
      expect(result).toEqual(mockProducts);
    });

    it("should throw an error if user ID is invalid", async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await expect(productService.getAll("invaliduserid")).rejects.toThrow(
        "Invalid user ID"
      );
    });

    it("should throw an error if user is not found", async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      User.findById.mockResolvedValue(null);

      await expect(productService.getAll("nonexistentuser")).rejects.toThrow(
        "User not found"
      );
    });

    it("should throw an error if no products are found", async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      User.findById.mockResolvedValue({ _id: "user123" });
      Product.find.mockResolvedValue(null);

      await expect(productService.getAll("user123")).rejects.toThrow(
        "No products found for this user"
      );
    });
  });

  describe("getById", () => {
    it("should get a product by ID", async () => {
      const mockProduct = { _id: "product123" };
      Product.findById.mockResolvedValue(mockProduct);

      const result = await productService.getById("product123");

      expect(Product.findById).toHaveBeenCalledWith("product123");
      expect(result).toEqual(mockProduct);
    });

    it("should throw an error if product is not found", async () => {
      Product.findById.mockResolvedValue(null);

      await expect(
        productService.getById("nonexistentproduct")
      ).rejects.toThrow("Product not found");
    });
  });

  describe("update", () => {
    it("should update a product", async () => {
      const mockUpdatedProduct = {
        _id: "product123",
        name: "Updated Product",
        imageUrl: "new-image.jpg",
        header: "Updated Header",
        content: "Updated Content",
        questions: ["Updated Question"],
      };
      Product.findByIdAndUpdate.mockResolvedValue(mockUpdatedProduct);

      const result = await productService.update({
        productId: "product123",
        name: "Updated Product",
        imageUrl: "new-image.jpg",
        header: "Updated Header",
        content: "Updated Content",
        questions: ["Updated Question"],
      });

      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        "product123",
        {
          name: "Updated Product",
          imageUrl: "new-image.jpg",
          header: "Updated Header",
          content: "Updated Content",
          questions: ["Updated Question"],
        },
        { new: true }
      );
      expect(result).toEqual(mockUpdatedProduct);
    });

    it("should throw an error if product is not found during update", async () => {
      Product.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        productService.update({
          productId: "nonexistentproduct",
          name: "Updated Product",
        })
      ).rejects.toThrow("Product not found");
    });
  });

  describe("deleteOne", () => {
    it("should delete a product and associated reviews", async () => {
      const mockProduct = {
        _id: "product123",
        reviews: ["review1", "review2"],
      };
      Product.findById.mockResolvedValue(mockProduct);
      Review.deleteMany.mockResolvedValue({});
      Product.deleteOne.mockResolvedValue({});
      User.findByIdAndUpdate.mockResolvedValue({});

      const result = await productService.deleteOne("product123", "user123");

      expect(Product.findById).toHaveBeenCalledWith("product123");
      expect(Review.deleteMany).toHaveBeenCalledWith({
        _id: { $in: ["review1", "review2"] },
      });
      expect(Product.deleteOne).toHaveBeenCalledWith({ _id: "product123" });
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        { $pull: { products: expect.any(mongoose.Types.ObjectId) } },
        { new: true }
      );
      expect(result).toBe(
        "Product and associated reviews deleted successfully"
      );
    });

    it("should throw an error if product is not found during deletion", async () => {
      Product.findById.mockResolvedValue(null);

      await expect(
        productService.deleteOne("nonexistentproduct", "user123")
      ).rejects.toThrow("Product not found");
    });
  });
});
