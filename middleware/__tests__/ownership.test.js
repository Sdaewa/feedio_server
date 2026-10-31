jest.mock("../../models/Product", () => ({ findById: jest.fn() }));
jest.mock("../../models/Widget", () => ({ findById: jest.fn() }));
jest.mock("../../models/review", () => ({ Review: { findById: jest.fn() } }));

const Product = require("../../models/Product");
const Widget = require("../../models/Widget");
const { Review } = require("../../models/review");
const {
  requireProductOwner,
  requireReviewOwner,
  requireWidgetOwner,
} = require("../ownership");

const ALICE = "64b000000000000000000001";
const BOB = "64b000000000000000000002";
const PRODUCT = "64b0000000000000000000a1";
const REVIEW = "64b0000000000000000000b1";
const WIDGET = "64b0000000000000000000c1";

// Mongoose queries are chainable: Model.findById(id).select(...)
const query = (doc) => ({ select: jest.fn().mockResolvedValue(doc) });
const run = async (middleware, req) => {
  const next = jest.fn();
  await middleware(req, {}, next);
  return next.mock.calls[0][0]; // the error passed to next(), or undefined
};
const asAlice = (extra = {}) => ({ userData: { userId: ALICE }, params: {}, body: {}, query: {}, ...extra });

beforeEach(() => jest.clearAllMocks());

describe("requireProductOwner", () => {
  const mw = requireProductOwner((req) => req.params.productId);

  test("owner passes and req.product is set", async () => {
    Product.findById.mockReturnValue(query({ _id: PRODUCT, user: ALICE }));
    const req = asAlice({ params: { productId: PRODUCT } });
    expect(await run(mw, req)).toBeUndefined();
    expect(req.product.user).toBe(ALICE);
  });

  test("another user's product -> 403", async () => {
    Product.findById.mockReturnValue(query({ _id: PRODUCT, user: BOB }));
    const err = await run(mw, asAlice({ params: { productId: PRODUCT } }));
    expect(err.statusCode).toBe(403);
  });

  test("missing product -> 404", async () => {
    Product.findById.mockReturnValue(query(null));
    const err = await run(mw, asAlice({ params: { productId: PRODUCT } }));
    expect(err.statusCode).toBe(404);
  });

  test("malformed id -> 400 and no database call", async () => {
    const err = await run(mw, asAlice({ params: { productId: "not-an-id" } }));
    expect(err.statusCode).toBe(400);
    expect(Product.findById).not.toHaveBeenCalled();
  });

  test("a NoSQL-injection object as the id is rejected", async () => {
    const err = await run(mw, asAlice({ params: { productId: { $ne: null } } }));
    expect(err.statusCode).toBe(400);
    expect(Product.findById).not.toHaveBeenCalled();
  });
});

describe("requireReviewOwner", () => {
  const mw = requireReviewOwner((req) => req.params.rid);

  test("review of my product passes", async () => {
    Review.findById.mockReturnValue(query({ product: PRODUCT }));
    Product.findById.mockReturnValue(query({ _id: PRODUCT, user: ALICE }));
    expect(await run(mw, asAlice({ params: { rid: REVIEW } }))).toBeUndefined();
  });

  test("review of someone else's product -> 403", async () => {
    Review.findById.mockReturnValue(query({ product: PRODUCT }));
    Product.findById.mockReturnValue(query({ _id: PRODUCT, user: BOB }));
    const err = await run(mw, asAlice({ params: { rid: REVIEW } }));
    expect(err.statusCode).toBe(403);
  });

  test("missing review -> 404", async () => {
    Review.findById.mockReturnValue(query(null));
    const err = await run(mw, asAlice({ params: { rid: REVIEW } }));
    expect(err.statusCode).toBe(404);
  });
});

describe("requireWidgetOwner", () => {
  const mw = requireWidgetOwner((req) => req.params.wid);

  test("widget of my product passes", async () => {
    Widget.findById.mockReturnValue(query({ product: PRODUCT }));
    Product.findById.mockReturnValue(query({ _id: PRODUCT, user: ALICE }));
    expect(await run(mw, asAlice({ params: { wid: WIDGET } }))).toBeUndefined();
  });

  test("widget of someone else's product -> 403", async () => {
    Widget.findById.mockReturnValue(query({ product: PRODUCT }));
    Product.findById.mockReturnValue(query({ _id: PRODUCT, user: BOB }));
    const err = await run(mw, asAlice({ params: { wid: WIDGET } }));
    expect(err.statusCode).toBe(403);
  });
});
