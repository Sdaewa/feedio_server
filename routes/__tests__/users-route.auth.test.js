const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";

// Mock the service so these tests need no database: they only prove that the
// router refuses the request before any service code runs.
jest.mock("../../services/userService", () => ({
  register: jest.fn(),
  login: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  deleteUser: jest.fn(),
  getUserById: jest.fn(),
  searchUsers: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  updateUserMembershipStatus: jest.fn(),
}));

const userService = require("../../services/userService");
const usersRoute = require("../users-route");

const app = express();
app.use(express.json());
app.use("/api/users", usersRoute);

const tokenFor = (userId) =>
  jwt.sign({ userId, email: `${userId}@example.com` }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

const ALICE = "64b000000000000000000001";
const BOB = "64b000000000000000000002";

beforeEach(() => jest.clearAllMocks());

describe("protected user routes", () => {
  const calls = [
    ["get", `/api/users/${BOB}`],
    ["put", `/api/users/${BOB}`],
    ["delete", `/api/users/${BOB}`],
    ["get", `/api/users/${BOB}/check-status`],
  ];

  test.each(calls)("%s %s without a token -> 401", async (method, url) => {
    const res = await request(app)[method](url).send({ password: "hacked-123" });
    expect(res.status).toBe(401);
  });

  test.each(calls)(
    "%s %s with ANOTHER user's token -> 403 and no service call",
    async (method, url) => {
      const res = await request(app)
        [method](url)
        .set("Authorization", `Bearer ${tokenFor(ALICE)}`)
        .send({ password: "hacked-123" });

      expect(res.status).toBe(403);
      expect(userService.update).not.toHaveBeenCalled();
      expect(userService.deleteUser).not.toHaveBeenCalled();
      expect(userService.getById).not.toHaveBeenCalled();
    }
  );

  test("owner can read their own account", async () => {
    userService.getById.mockResolvedValue({ userId: ALICE, name: "Alice" });
    const res = await request(app)
      .get(`/api/users/${ALICE}`)
      .set("Authorization", `Bearer ${tokenFor(ALICE)}`);
    expect(res.status).toBe(200);
    expect(userService.getById).toHaveBeenCalledWith(ALICE);
  });

  test("owner can update their own account", async () => {
    userService.update.mockResolvedValue("ok");
    const res = await request(app)
      .put(`/api/users/${ALICE}`)
      .set("Authorization", `Bearer ${tokenFor(ALICE)}`)
      .send({ name: "Alice B" });
    expect(res.status).toBe(200);
    expect(userService.update).toHaveBeenCalledTimes(1);
  });

  test("an expired or forged token is rejected", async () => {
    const forged = jwt.sign({ userId: ALICE }, "some-other-secret-value-xxxxxxxxxxxx");
    const res = await request(app)
      .get(`/api/users/${ALICE}`)
      .set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });
});

describe("user search route", () => {
  test("no longer exists (it listed every user's email)", async () => {
    const res = await request(app).get("/api/users/search");
    // Without a token it must not reach a handler; it is treated as /:id.
    expect([401, 403, 404]).toContain(res.status);
    expect(userService.searchUsers).not.toHaveBeenCalled();
  });
});

describe("public routes stay public", () => {
  test("login does not need a token", async () => {
    userService.login.mockResolvedValue({ token: "t" });
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "a@example.com", password: "secret-123" });
    expect(res.status).toBe(200);
  });

  test("register does not need a token", async () => {
    userService.register.mockResolvedValue({ token: "t" });
    const res = await request(app).post("/api/users/register").send({
      name: "A",
      email: "a@example.com",
      password: "Secret-123!",
      termsAccepted: true,
    });
    expect([201, 422]).toContain(res.status); // 422 = validation, still not 401
    expect(res.status).not.toBe(401);
  });
});
