const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const widgetService = require("../widgetService");
const Widget = require("../../models/Widget");
const { Review } = require("../../models/review");
const Product = require("../../models/Product");

jest.mock("mongoose");
jest.mock("fs");
jest.mock("path");
jest.mock("handlebars");
jest.mock("../../models/Widget");
jest.mock("../../models/review");
jest.mock("../../models/Product");

describe("Widget Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateWidgetConfig", () => {
    it("should update an existing widget", async () => {
      const mockWidget = {
        _id: "widget123",
        save: jest.fn(),
      };
      Widget.findOne.mockResolvedValue(mockWidget);
      const mockProduct = {
        _id: "product123",
        widgets: [],
        save: jest.fn(),
      };
      Product.findById.mockResolvedValue(mockProduct);

      const result = await widgetService.generateWidgetConfig(
        "product123",
        0.5,
        false,
        "carousel",
        true,
        "white",
        "black",
        "bottom"
      );

      expect(Widget.findOne).toHaveBeenCalledWith({
        productId: "product123",
        type: "carousel",
      });
      expect(mockWidget.scrollSpeed).toBe(0.5);
      expect(mockWidget.hideDate).toBe(false);
      expect(mockWidget.type).toBe("carousel");
      expect(mockWidget.backgroundColor).toBe("white");
      expect(mockWidget.textColor).toBe("black");
      expect(mockWidget.location).toBe("bottom");
      expect(mockWidget.save).toHaveBeenCalled();
      expect(Product.findById).toHaveBeenCalledWith("product123");
      expect(mockProduct.widgets.push).toHaveBeenCalledWith("widget123");
      expect(mockProduct.save).toHaveBeenCalled();
      expect(result).toEqual(mockWidget);
    });

    it("should create a new widget if one does not exist", async () => {
      Widget.findOne.mockResolvedValue(null);
      const mockNewWidget = {
        _id: "newWidget123",
        save: jest.fn(),
      };
      Widget.mockImplementation(() => mockNewWidget);
      const mockProduct = {
        _id: "product123",
        widgets: [],
        save: jest.fn(),
      };
      Product.findById.mockResolvedValue(mockProduct);

      const result = await widgetService.generateWidgetConfig(
        "product123",
        0.5,
        false,
        "carousel",
        true,
        "white",
        "black",
        "bottom"
      );

      expect(Widget).toHaveBeenCalledWith({
        product: "product123",
        scrollSpeed: 0.5,
        hideDate: false,
        type: "carousel",
        backgroundColor: "white",
        textColor: "black",
        location: "bottom",
      });
      expect(mockNewWidget.save).toHaveBeenCalled();
      expect(Product.findById).toHaveBeenCalledWith("product123");
      expect(mockProduct.widgets.push).toHaveBeenCalledWith("newWidget123");
      expect(mockProduct.save).toHaveBeenCalled();
      expect(result).toEqual(mockNewWidget);
    });
  });

  describe("getWidgets", () => {
    it("should fetch widgets for a product", async () => {
      const mockWidgets = [{ _id: "widget1" }, { _id: "widget2" }];
      Widget.find.mockResolvedValue(mockWidgets);

      const result = await widgetService.getWidgets("product123");

      expect(Widget.find).toHaveBeenCalledWith({
        product: expect.any(mongoose.Types.ObjectId),
      });
      expect(result).toEqual(mockWidgets);
    });

    it("should throw an error if fetching widgets fails", async () => {
      Widget.find.mockRejectedValue(new Error("Database error"));

      await expect(widgetService.getWidgets("product123")).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("getWidgetConfig", () => {
    it("should fetch a specific widget config", async () => {
      const mockWidget = { _id: "widget123", type: "carousel" };
      Widget.findOne.mockResolvedValue(mockWidget);

      const result = await widgetService.getWidgetConfig(
        "widget123",
        "product123"
      );

      expect(Widget.findOne).toHaveBeenCalledWith({
        _id: expect.any(mongoose.Types.ObjectId),
        product: expect.any(mongoose.Types.ObjectId),
      });
      expect(result).toEqual(mockWidget);
    });

    it("should throw an error if fetching widget config fails", async () => {
      Widget.findOne.mockRejectedValue(new Error("Database error"));

      await expect(
        widgetService.getWidgetConfig("widget123", "product123")
      ).rejects.toThrow("Database error");
    });
  });

  describe("generateWidgetRepresentation", () => {
    it("should generate widget representation for carousel type", async () => {
      const mockReviews = [
        { name: "User1", feedback: "Great!", rating: 5, createdAt: new Date() },
      ];
      Review.find.mockResolvedValue(mockReviews);
      const mockProduct = {
        name: "Product1",
        header: "Header",
        content: "Content",
        questions: [],
        averageRating: 4.5,
      };
      Product.findById.mockResolvedValue(mockProduct);
      fs.readFileSync.mockReturnValue("template content");
      handlebars.compile.mockReturnValue(() => "compiled template");

      const result = await widgetService.generateWidgetRepresentation(
        "product123",
        0.5,
        false,
        "carousel",
        true,
        "white",
        "black"
      );

      expect(Review.find).toHaveBeenCalledWith({
        product: "product123",
        status: "fav",
      });
      expect(Product.findById).toHaveBeenCalledWith("product123");
      expect(fs.readFileSync).toHaveBeenCalledTimes(2); // template and style
      expect(handlebars.compile).toHaveBeenCalled();
      expect(result).toContain("compiled template");
      expect(result).toContain("<style>template content</style>");
      expect(result).toContain("<script>template content</script>");
    });

    it("should throw an error for invalid widget type", async () => {
      await expect(
        widgetService.generateWidgetRepresentation(
          "product123",
          0.5,
          false,
          "invalid_type",
          true,
          "white",
          "black"
        )
      ).rejects.toThrow("Invalid widget type");
    });
  });

  describe("deleteWidget", () => {
    it("should delete a widget and update the product", async () => {
      const mockWidget = { _id: "widget123", product: "product123" };
      Widget.findById.mockResolvedValue(mockWidget);
      const mockProduct = {
        _id: "product123",
        widgets: ["widget123"],
        save: jest.fn(),
      };
      Product.findByIdAndUpdate.mockResolvedValue(mockProduct);
      Widget.findByIdAndDelete.mockResolvedValue({});

      await widgetService.deleteWidget("widget123");

      expect(Widget.findById).toHaveBeenCalledWith("widget123");
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        "product123",
        { $pull: { widgets: "widget123" } },
        { new: true }
      );
      expect(Widget.findByIdAndDelete).toHaveBeenCalledWith("widget123");
    });

    it("should throw an error if widget is not found", async () => {
      Widget.findById.mockResolvedValue(null);

      await expect(
        widgetService.deleteWidget("nonexistentwidget")
      ).rejects.toThrow("Widget not found");
    });

    it("should throw an error if deleting widget fails", async () => {
      Widget.findById.mockResolvedValue({
        _id: "widget123",
        product: "product123",
      });
      Product.findByIdAndUpdate.mockRejectedValue(new Error("Database error"));

      await expect(widgetService.deleteWidget("widget123")).rejects.toThrow(
        "Database error"
      );
    });
  });
});
