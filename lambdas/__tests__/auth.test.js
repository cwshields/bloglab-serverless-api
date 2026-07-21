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
});
