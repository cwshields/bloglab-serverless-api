process.env.PODCAST_COMMENTS_TABLE = "podcast-comments-table";
process.env.USERS_TABLE = "users-table";
process.env.JWT_SECRET = "test-secret";

jest.mock("aws-sdk", () => {
  const documentClient = { get: jest.fn(), delete: jest.fn() };
  return { DynamoDB: { DocumentClient: jest.fn(() => documentClient) } };
});

const AWS = require("aws-sdk");
const auth = require("../auth");
const { handler } = require("../deletePodcastComment");

describe("deletePodcastComment handler", () => {
  const documentClient = new AWS.DynamoDB.DocumentClient();
  const token = auth.signToken({ id: "user-1", email: "a@b.com", username: "abee" });
  const adminToken = auth.signToken({ id: "admin-1", email: "admin@b.com", username: "admin" });

  function mockComment(comment) {
    documentClient.get.mockImplementation(({ TableName }) => ({
      promise: () =>
        Promise.resolve(
          TableName === "podcast-comments-table" ? { Item: comment } : { Item: { is_admin: false } }
        ),
    }));
  }

  beforeEach(() => {
    documentClient.get.mockReset();
    documentClient.delete.mockReset();
    documentClient.delete.mockReturnValue({ promise: () => Promise.resolve({}) });
  });

  test("returns 401 when there is no valid Bearer token", async () => {
    const result = await handler({ pathParameters: { commentId: "1" } });

    expect(result.statusCode).toBe(401);
    expect(documentClient.delete).not.toHaveBeenCalled();
  });

  test("returns 400 when commentId is missing", async () => {
    const result = await handler({ headers: { Authorization: `Bearer ${token}` }, pathParameters: {} });

    expect(result.statusCode).toBe(400);
  });

  test("returns 404 when the comment does not exist", async () => {
    mockComment(undefined);

    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      pathParameters: { commentId: "1" },
    });

    expect(result.statusCode).toBe(404);
    expect(documentClient.delete).not.toHaveBeenCalled();
  });

  test("returns 403 when a non-owner, non-admin user tries to delete someone else's comment", async () => {
    mockComment({ id: 1, episodeId: 10, userId: "someone-else" });

    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      pathParameters: { commentId: "1" },
    });

    expect(result.statusCode).toBe(403);
    expect(documentClient.delete).not.toHaveBeenCalled();
  });

  test("allows the comment's own author to delete it", async () => {
    mockComment({ id: 1, episodeId: 10, userId: "user-1" });

    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      pathParameters: { commentId: "1" },
    });

    expect(result.statusCode).toBe(200);
    expect(documentClient.delete).toHaveBeenCalledWith({
      TableName: "podcast-comments-table",
      Key: { id: 1 },
    });
  });

  test("allows an admin to delete someone else's comment", async () => {
    documentClient.get.mockImplementation(({ TableName }) => ({
      promise: () =>
        Promise.resolve(
          TableName === "podcast-comments-table"
            ? { Item: { id: 1, episodeId: 10, userId: "someone-else" } }
            : { Item: { is_admin: true } }
        ),
    }));

    const result = await handler({
      headers: { Authorization: `Bearer ${adminToken}` },
      pathParameters: { commentId: "1" },
    });

    expect(result.statusCode).toBe(200);
    expect(documentClient.delete).toHaveBeenCalledWith({
      TableName: "podcast-comments-table",
      Key: { id: 1 },
    });
  });

  test("returns 500 when the database call fails", async () => {
    documentClient.get.mockReturnValue({ promise: () => Promise.reject(new Error("boom")) });

    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      pathParameters: { commentId: "1" },
    });

    expect(result.statusCode).toBe(500);
  });
});
