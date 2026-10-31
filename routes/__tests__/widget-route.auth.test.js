const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";

jest.mock("../../services/widgetService", () => ({
  generateWidgetConfig: jest.fn(),
  getWidgets: jest.fn(),
  getWidgetConfig: jest.fn(),
  generateWidgetRepresentation: jest.fn(),
  deleteWidget: jest.fn(),
}));
jest.mock("../../models/Product", () => ({ findById: jest.fn() }));
jest.mock("../../models/Widget", () => ({ findById: jest.fn() }));
jest.mock("../../models/review", () => ({ Review: { findById: jest.fn() } }));

const widgetService = require("../../services/widgetService");
const Product = require("../../models/Product");
const Widget = require("../../models/Widget");
const widgetRoute = require("../widget-route");

const app = express();
app.use(express.json());
app.use("/api/widgets", widgetRoute);

const ALICE = "64b000000000000000000001";
const BOB = "64b000000000000000000002";
const PRODUCT = "64b0000000000000000000a1";
const WIDGET = "64b0000000000000000000c1";

const auth = (userId) => ({
  Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" })}`,
});
const query = (doc) => ({ select: jest.fn().mockResolvedValue(doc) });
const productOwnedBy = (userId) => Product.findById.mockReturnValue(query({ user: userId }));

beforeEach(() => {
  jest.clearAllMocks();
  Widget.findById.mockReturnValue(query({ product: PRODUCT }));
});

describe("without a token", () => {
  test("GET /api/widgets/ -> 401 (not 500, not data)", async () => {
    const res = await request(app).get(`/api/widgets/?productId=${PRODUCT}`);
    expect(res.status).toBe(401);
    expect(widgetService.getWidgets).not.toHaveBeenCalled();
  });

  test("POST /config -> 401", async () => {
    const res = await request(app).post("/api/widgets/config").send({ productId: PRODUCT, userId: ALICE, type: "carousel" });
    expect(res.status).toBe(401);
    expect(widgetService.generateWidgetConfig).not.toHaveBeenCalled();
  });

  test("GET /:wid -> 401", async () => {
    expect((await request(app).get(`/api/widgets/${WIDGET}`)).status).toBe(401);
  });

  test("DELETE /:wid -> 401 and nothing deleted", async () => {
    const res = await request(app).delete(`/api/widgets/${WIDGET}`);
    expect(res.status).toBe(401);
    expect(widgetService.deleteWidget).not.toHaveBeenCalled();
  });
});

describe("with another user's token", () => {
  beforeEach(() => productOwnedBy(BOB));

  test("list -> 403", async () => {
    const res = await request(app).get(`/api/widgets/?productId=${PRODUCT}`).set(auth(ALICE));
    expect(res.status).toBe(403);
    expect(widgetService.getWidgets).not.toHaveBeenCalled();
  });

  test("create -> 403", async () => {
    const res = await request(app).post("/api/widgets/config").set(auth(ALICE))
      .send({ productId: PRODUCT, userId: ALICE, type: "carousel" });
    expect(res.status).toBe(403);
    expect(widgetService.generateWidgetConfig).not.toHaveBeenCalled();
  });

  test("delete -> 403 and nothing deleted", async () => {
    const res = await request(app).delete(`/api/widgets/${WIDGET}`).set(auth(ALICE));
    expect(res.status).toBe(403);
    expect(widgetService.deleteWidget).not.toHaveBeenCalled();
  });
});

describe("as the owner", () => {
  beforeEach(() => productOwnedBy(ALICE));

  test("list works", async () => {
    widgetService.getWidgets.mockResolvedValue([{ _id: WIDGET }]);
    const res = await request(app).get(`/api/widgets/?productId=${PRODUCT}`).set(auth(ALICE));
    expect(res.status).toBe(200);
    expect(widgetService.getWidgets).toHaveBeenCalledWith(PRODUCT);
  });

  test("delete works", async () => {
    widgetService.deleteWidget.mockResolvedValue();
    const res = await request(app).delete(`/api/widgets/${WIDGET}`).set(auth(ALICE));
    expect(res.status).toBe(200);
    expect(widgetService.deleteWidget).toHaveBeenCalledWith(WIDGET);
  });
});

describe("public embed route", () => {
  test("GET /:wid/serve works without a token", async () => {
    widgetService.getWidgetConfig.mockResolvedValue({ product: PRODUCT, type: "carousel" });
    widgetService.generateWidgetRepresentation.mockResolvedValue("<div>widget</div>");
    const res = await request(app).get(`/api/widgets/${WIDGET}/serve`);
    expect(res.status).toBe(200);
    expect(res.text).toBe("<div>widget</div>");
  });
});
