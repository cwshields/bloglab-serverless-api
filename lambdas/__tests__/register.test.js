process.env.USERS_TABLE = "users-table";
process.env.JWT_SECRET = "test-secret";

jest.mock("aws-sdk", () => {
  const documentClient = { query: jest.fn(), put: jest.fn() };
  return { DynamoDB: { DocumentClient: jest.fn(() => documentClient) } };
});

const AWS = require("aws-sdk");
const auth = require("../auth");
const { handler } = require("../register");

describe("register handler", () => {
  const documentClient = new AWS.DynamoDB.DocumentClient();

  const emptyQuery = { promise: () => Promise.resolve({ Items: [] }) };
  const validBody = {
    email: "New.User@Example.com",
    username: "NewUser",
    firstName: "New",
    lastName: "User",
    password: "password123",
  };

  beforeEach(() => {
    documentClient.query.mockReset();
    documentClient.put.mockReset();
    documentClient.query.mockReturnValue(emptyQuery);
    documentClient.put.mockReturnValue({ promise: () => Promise.resolve({}) });
  });

  test("returns 400 for invalid JSON body", async () => {
    const result = await handler({ body: "{not json" });
    expect(result.statusCode).toBe(400);
  });

  test("returns 400 when a required field is missing", async () => {
    const { password, ...rest } = validBody;
    const result = await handler({ body: JSON.stringify(rest) });
    expect(result.statusCode).toBe(400);
  });

  test("returns 400 when the password is too short", async () => {
    const result = await handler({ body: JSON.stringify({ ...validBody, password: "abc" }) });
    expect(result.statusCode).toBe(400);
  });

  test("returns 400 when the email is already in use", async () => {
    documentClient.query.mockReturnValueOnce({ promise: () => Promise.resolve({ Items: [{ id: "existing" }] }) });

    const result = await handler({ body: JSON.stringify(validBody) });

    expect(result.statusCode).toBe(400);
    expect(documentClient.put).not.toHaveBeenCalled();
  });

  test("returns 400 when the username is already in use", async () => {
    documentClient.query
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce({ promise: () => Promise.resolve({ Items: [{ id: "existing" }] }) });

    const result = await handler({ body: JSON.stringify(validBody) });

    expect(result.statusCode).toBe(400);
    expect(documentClient.put).not.toHaveBeenCalled();
  });

  test("normalizes email/username, hashes the password, and returns 200 with a token", async () => {
    const result = await handler({ body: JSON.stringify(validBody) });

    expect(result.statusCode).toBe(200);
    expect(documentClient.put).toHaveBeenCalledTimes(1);

    const putArgs = documentClient.put.mock.calls[0][0];
    expect(putArgs.TableName).toBe("users-table");
    expect(putArgs.ConditionExpression).toBe("attribute_not_exists(id)");
    expect(putArgs.Item.email).toBe("new.user@example.com");
    expect(putArgs.Item.username).toBe("newuser");
    expect(putArgs.Item.password).not.toBe(validBody.password);
    await expect(auth.comparePassword(validBody.password, putArgs.Item.password)).resolves.toBe(true);

    const body = JSON.parse(result.body);
    expect(body.user.password).toBeUndefined();
    expect(auth.verifyToken(body.token)).toMatchObject({ email: "new.user@example.com", username: "newuser" });
  });

  test("returns 500 when the database call fails", async () => {
    documentClient.put.mockReturnValue({ promise: () => Promise.reject(new Error("boom")) });

    const result = await handler({ body: JSON.stringify(validBody) });

    expect(result.statusCode).toBe(500);
  });
});
