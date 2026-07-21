process.env.USERS_TABLE = "users-table";
process.env.JWT_SECRET = "test-secret";

jest.mock("aws-sdk", () => {
  const documentClient = { query: jest.fn(), put: jest.fn() };
  return { DynamoDB: { DocumentClient: jest.fn(() => documentClient) } };
});

const AWS = require("aws-sdk");
const auth = require("../auth");
const { handler } = require("../login");

describe("login handler", () => {
  const documentClient = new AWS.DynamoDB.DocumentClient();

  const emptyQuery = { promise: () => Promise.resolve({ Items: [] }) };

  beforeEach(() => {
    documentClient.query.mockReset();
  });

  test("returns 400 for invalid JSON body", async () => {
    const result = await handler({ body: "{not json" });
    expect(result.statusCode).toBe(400);
  });

  test("returns 400 when identifier or password is missing", async () => {
    const result = await handler({ body: JSON.stringify({ identifier: "a@b.com" }) });
    expect(result.statusCode).toBe(400);
  });

  test("returns 401 when no user matches the identifier", async () => {
    documentClient.query.mockReturnValue(emptyQuery);

    const result = await handler({
      body: JSON.stringify({ identifier: "nobody@example.com", password: "whatever" }),
    });

    expect(result.statusCode).toBe(401);
  });

  test("returns 401 when the password does not match", async () => {
    const passwordHash = await auth.hashPassword("correct-password");
    documentClient.query.mockReturnValueOnce({
      promise: () => Promise.resolve({ Items: [{ id: "u1", email: "a@b.com", username: "abee", password: passwordHash }] }),
    });

    const result = await handler({
      body: JSON.stringify({ identifier: "a@b.com", password: "wrong-password" }),
    });

    expect(result.statusCode).toBe(401);
  });

  test("returns 200 with a token and the public user on success", async () => {
    const passwordHash = await auth.hashPassword("correct-password");
    documentClient.query.mockReturnValueOnce({
      promise: () => Promise.resolve({ Items: [{ id: "u1", email: "a@b.com", username: "abee", password: passwordHash }] }),
    });

    const result = await handler({
      body: JSON.stringify({ identifier: "a@b.com", password: "correct-password" }),
    });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.user).toEqual({ id: "u1", email: "a@b.com", username: "abee" });
    expect(auth.verifyToken(body.token)).toMatchObject({ sub: "u1", email: "a@b.com" });
  });

  test("falls back to the username index when the email index has no match", async () => {
    const passwordHash = await auth.hashPassword("correct-password");
    documentClient.query
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ Items: [{ id: "u1", email: "a@b.com", username: "abee", password: passwordHash }] }),
      });

    const result = await handler({
      body: JSON.stringify({ identifier: "abee", password: "correct-password" }),
    });

    expect(result.statusCode).toBe(200);
    expect(documentClient.query).toHaveBeenCalledTimes(2);
  });

  test("returns 500 when the database call fails", async () => {
    documentClient.query.mockReturnValue({ promise: () => Promise.reject(new Error("boom")) });

    const result = await handler({
      body: JSON.stringify({ identifier: "a@b.com", password: "whatever" }),
    });

    expect(result.statusCode).toBe(500);
  });
});
