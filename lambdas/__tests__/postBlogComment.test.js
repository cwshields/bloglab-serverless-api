process.env.BLOG_COMMENTS_TABLE = "blog-comments-table";
process.env.JWT_SECRET = "test-secret";

jest.mock("aws-sdk", () => {
  const documentClient = { put: jest.fn() };
  return { DynamoDB: { DocumentClient: jest.fn(() => documentClient) } };
});

const AWS = require("aws-sdk");
const auth = require("../auth");
const { handler } = require("../postBlogComment");

describe("postBlogComment handler", () => {
  const documentClient = new AWS.DynamoDB.DocumentClient();
  const token = auth.signToken({ id: "user-1", email: "a@b.com", username: "abee" });

  beforeEach(() => {
    documentClient.put.mockReset();
    documentClient.put.mockReturnValue({ promise: () => Promise.resolve({}) });
  });

  test("returns 401 when there is no valid Bearer token", async () => {
    const result = await handler({ body: JSON.stringify({ blogId: 1, body: "Nice post!" }) });

    expect(result.statusCode).toBe(401);
    expect(documentClient.put).not.toHaveBeenCalled();
  });

  test("returns 400 for invalid JSON body", async () => {
    const result = await handler({ headers: { Authorization: `Bearer ${token}` }, body: "{not json" });

    expect(result.statusCode).toBe(400);
  });

  test("returns 400 when blogId or body is missing", async () => {
    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ blogId: 1 }),
    });

    expect(result.statusCode).toBe(400);
  });

  test("writes a comment derived from the token's userId, not a client-supplied one", async () => {
    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ blogId: 1, body: "Nice post!", userId: "someone-else" }),
    });

    expect(result.statusCode).toBe(200);

    const putArgs = documentClient.put.mock.calls[0][0];
    expect(putArgs.TableName).toBe("blog-comments-table");
    expect(putArgs.Item).toMatchObject({ blogId: 1, userId: "user-1", body: "Nice post!" });
    expect(putArgs.Item.id).toEqual(expect.any(Number));

    const comment = JSON.parse(result.body);
    expect(comment).toMatchObject({ blogId: 1, userId: "user-1", body: "Nice post!" });
  });

  test("returns 500 when the database call fails", async () => {
    documentClient.put.mockReturnValue({ promise: () => Promise.reject(new Error("boom")) });

    const result = await handler({
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ blogId: 1, body: "Nice post!" }),
    });

    expect(result.statusCode).toBe(500);
  });
});
