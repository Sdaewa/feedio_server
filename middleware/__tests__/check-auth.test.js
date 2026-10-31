const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";

const checkAuth = require("../check-auth");

const run = async (req) => {
  const next = jest.fn();
  await checkAuth(req, {}, next);
  return { req, error: next.mock.calls[0][0] };
};
const token = (payload, secret = process.env.JWT_SECRET) => jwt.sign(payload, secret, { expiresIn: "1h" });

describe("check-auth", () => {
  test.each(["/", "/login", "/api/users/login", "/static/x.js", "/api-docs/"])(
    "path %s without a token -> 401 (no path is exempt)",
    async (path) => {
      const { error } = await run({ method: "GET", path, headers: {} });
      expect(error.statusCode).toBe(401);
    }
  );

  test("valid token sets req.userData", async () => {
    const { req, error } = await run({
      method: "GET",
      path: "/",
      headers: { authorization: `Bearer ${token({ userId: "u1", email: "a@b.c" })}` },
    });
    expect(error).toBeUndefined();
    expect(req.userData.userId).toBe("u1");
  });

  test("token signed with another secret -> 401", async () => {
    const forged = token({ userId: "u1" }, "another-secret-another-secret-xxxxxx");
    const { error } = await run({ method: "GET", path: "/", headers: { authorization: `Bearer ${forged}` } });
    expect(error.statusCode).toBe(401);
  });

  test("CORS preflight (OPTIONS) is allowed without a token", async () => {
    const { error } = await run({ method: "OPTIONS", path: "/", headers: {} });
    expect(error).toBeUndefined();
  });
});
