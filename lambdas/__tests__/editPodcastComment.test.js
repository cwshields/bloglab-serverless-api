process.env.PODCAST_COMMENTS_TABLE = "podcast-comments-table";
process.env.JWT_SECRET = "test-secret";

jest.mock("aws-sdk", () => {
  const documentClient = { get: jest.fn(), update: jest.fn() };
  return { DynamoDB: { DocumentClient: jest.fn(() => documentClient) } };
});

const AWS = require("aws-sdk");
const auth = require("../auth");
const { handler } = require("../editPodcastComment");

describe("editPodcastComment handler", () => {
  const documentClient = new AWS.DynamoDB.DocumentClient();
  const token = auth.signToken({ id: "user-1", email: "a@b.com", username: "abee" });

  beforeEach(() => {
    documentClient.get.mockReset();
    documentClient.update.mockReset();
    documentClient.update.mockReturnValue({
      promise: () =>
        Promise.resolve({ Attributes: { id: 1, episodeId: 10, userId: "user-1", body: "Updated!" } }),
    });
  });

  test("returns 401 when there is no valid Bearer token", async () => {
    const result = await handler({
      pathParameters: { commentId: "1" },
      body: JSON.stringify({ body: "Updated!" }),
    });

    expect(result.statusCode).toBe(401);
    expect(documentClient.update).not.toHaveBeenCalled();
  });

  test("returns 400 when commentId is missing", async () => {
    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      pathParameters: {},
      body: JSON.stringify({ body: "Updated!" }),
    });

    expect(result.statusCode).toBe(400);
  });

  test("returns 400 for invalid JSON body", async () => {
    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      pathParameters: { commentId: "1" },
      body: "{not json",
    });

    expect(result.statusCode).toBe(400);
  });

  test("returns 400 when body is missing", async () => {
    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      pathParameters: { commentId: "1" },
      body: JSON.stringify({}),
    });

    expect(result.statusCode).toBe(400);
  });

  test("returns 404 when the comment does not exist", async () => {
    documentClient.get.mockReturnValue({ promise: () => Promise.resolve({ Item: undefined }) });

    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      pathParameters: { commentId: "1" },
      body: JSON.stringify({ body: "Updated!" }),
    });

    expect(result.statusCode).toBe(404);
    expect(documentClient.update).not.toHaveBeenCalled();
  });

  test("returns 403 when a non-owner tries to edit someone else's comment", async () => {
    documentClient.get.mockReturnValue({
      promise: () => Promise.resolve({ Item: { id: 1, episodeId: 10, userId: "someone-else" } }),
    });

    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      pathParameters: { commentId: "1" },
      body: JSON.stringify({ body: "Updated!" }),
    });

    expect(result.statusCode).toBe(403);
    expect(documentClient.update).not.toHaveBeenCalled();
  });

  test("allows the comment's own author to edit it", async () => {
    documentClient.get.mockReturnValue({
      promise: () => Promise.resolve({ Item: { id: 1, episodeId: 10, userId: "user-1" } }),
    });

    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      pathParameters: { commentId: "1" },
      body: JSON.stringify({ body: "Updated!" }),
    });

    expect(result.statusCode).toBe(200);
    const updateArgs = documentClient.update.mock.calls[0][0];
    expect(updateArgs.TableName).toBe("podcast-comments-table");
    expect(updateArgs.Key).toEqual({ id: 1 });
    expect(updateArgs.ExpressionAttributeValues[":body"]).toBe("Updated!");

    const comment = JSON.parse(result.body);
    expect(comment).toMatchObject({ id: 1, episodeId: 10, userId: "user-1", body: "Updated!" });
  });

  test("returns 500 when the database call fails", async () => {
    documentClient.get.mockReturnValue({
      promise: () => Promise.reject(new Error("boom")),
    });

    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      pathParameters: { commentId: "1" },
      body: JSON.stringify({ body: "Updated!" }),
    });

    expect(result.statusCode).toBe(500);
  });
});
