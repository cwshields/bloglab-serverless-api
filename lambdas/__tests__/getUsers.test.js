process.env.USERS_TABLE = "users-table";

jest.mock("aws-sdk", () => {
  const documentClient = { get: jest.fn() };
  return { DynamoDB: { DocumentClient: jest.fn(() => documentClient) } };
});

const AWS = require("aws-sdk");
const { handler } = require("../getUsers");

describe("getUsers handler", () => {
  const documentClient = new AWS.DynamoDB.DocumentClient();

  beforeEach(() => {
    documentClient.get.mockReset();
  });

  test("returns 400 when the ID path parameter is missing", async () => {
    const result = await handler({});
    expect(result.statusCode).toBe(400);
  });

  test("returns 400 when no user matches the ID", async () => {
    documentClient.get.mockReturnValue({ promise: () => Promise.resolve({}) });

    const result = await handler({ pathParameters: { ID: "does-not-exist" } });

    expect(result.statusCode).toBe(400);
  });

  test("returns 200 with the public user when the ID matches", async () => {
    documentClient.get.mockReturnValue({
      promise: () =>
        Promise.resolve({
          Item: { id: "8026058267", email: "cshields@drino.com", username: "cshields", password: "hashed" },
        }),
    });

    const result = await handler({ pathParameters: { ID: "8026058267" } });

    expect(result.statusCode).toBe(200);
    const user = JSON.parse(result.body);
    expect(user).toEqual({ id: "8026058267", email: "cshields@drino.com", username: "cshields" });
    expect(documentClient.get).toHaveBeenCalledWith({
      TableName: "users-table",
      Key: { id: "8026058267" },
    });
  });

  test("returns 500 when the database call fails", async () => {
    documentClient.get.mockReturnValue({ promise: () => Promise.reject(new Error("boom")) });

    const result = await handler({ pathParameters: { ID: "8026058267" } });

    expect(result.statusCode).toBe(500);
  });
});
