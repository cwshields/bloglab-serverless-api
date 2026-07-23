const jwt = require("jsonwebtoken");

describe("auth", () => {
  const OLD_ENV = process.env;
  let auth;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, JWT_SECRET: "test-secret" };
    auth = require("../auth");
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test("hashPassword produces a bcrypt hash that comparePassword accepts", async () => {
    const hash = await auth.hashPassword("correct-horse");

    expect(hash).not.toBe("correct-horse");
    await expect(auth.comparePassword("correct-horse", hash)).resolves.toBe(true);
    await expect(auth.comparePassword("wrong-password", hash)).resolves.toBe(false);
  });

  test("signToken embeds the user's public identity and verifyToken round-trips it", () => {
    const user = { id: "u1", email: "a@b.com", username: "abee", password: "should-not-appear" };

    const token = auth.signToken(user);
    const decoded = auth.verifyToken(token);

    expect(decoded).toMatchObject({ sub: "u1", email: "a@b.com", username: "abee" });
  });

  test("signToken signs with JWT_SECRET, so a different secret fails verification", () => {
    const token = auth.signToken({ id: "u1", email: "a@b.com", username: "abee" });

    expect(() => jwt.verify(token, "wrong-secret")).toThrow();
  });

  test("toPublicUser strips the password field", () => {
    const publicUser = auth.toPublicUser({ id: "u1", email: "a@b.com", password: "secret" });

    expect(publicUser).toEqual({ id: "u1", email: "a@b.com" });
    expect(publicUser.password).toBeUndefined();
  });

  describe("getUserIdFromEvent", () => {
    test("returns the token's subject for a valid Bearer token", () => {
      const token = auth.signToken({ id: "u1", email: "a@b.com", username: "abee" });

      expect(auth.getUserIdFromEvent({ headers: { Authorization: `Bearer ${token}` } })).toBe("u1");
    });

    test("is case-insensitive to the header name", () => {
      const token = auth.signToken({ id: "u1", email: "a@b.com", username: "abee" });

      expect(auth.getUserIdFromEvent({ headers: { authorization: `Bearer ${token}` } })).toBe("u1");
    });

    test("returns null when there is no headers object", () => {
      expect(auth.getUserIdFromEvent({})).toBeNull();
    });

    test("returns null when the header is missing the Bearer prefix", () => {
      const token = auth.signToken({ id: "u1", email: "a@b.com", username: "abee" });

      expect(auth.getUserIdFromEvent({ headers: { Authorization: token } })).toBeNull();
    });

    test("returns null for a token signed with a different secret", () => {
      const token = jwt.sign({ sub: "u1" }, "wrong-secret");

      expect(auth.getUserIdFromEvent({ headers: { Authorization: `Bearer ${token}` } })).toBeNull();
    });
  });
});
