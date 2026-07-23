process.env.JWT_SECRET = "test-secret";

const mockCommentsByBlogId = new Map([
  [1, [
    { id: 100, blogId: 1, userId: "user-2", body: "Nice post!" },
    { id: 101, blogId: 1, userId: "no-such-user", body: "From a deleted user" },
  ]],
  [2, [
    { id: 102, blogId: 2, userId: "user-1", body: "Comment on the other post" },
  ]],
]);

jest.mock("../blogsRepo", () => ({
  getAllBlogs: jest.fn(() =>
    Promise.resolve([
      { id: 1, title: "First post", userId: "user-1" },
      { id: 2, title: "Orphaned post", userId: "no-such-user" },
    ])
  ),
  getCommentsByBlogIds: jest.fn(() => Promise.resolve(mockCommentsByBlogId)),
}));

const mockUsersById = new Map([
  ["user-1", { id: "user-1", firstName: "Ada", lastName: "Lovelace", avatar: "ada.png", description: "d", location: "l", education: "e", work: "w", joined_date: "2020" }],
  ["user-2", { id: "user-2", firstName: "Grace", lastName: "Hopper", avatar: "grace.png", description: "d", location: "l", education: "e", work: "w", joined_date: "2021" }],
]);

jest.mock("../usersRepo", () => ({
  getUsersByIds: jest.fn(() => Promise.resolve(mockUsersById)),
}));

const auth = require("../auth");
const { handler } = require("../getBlogs");

describe("getBlogs handler", () => {
  test("hydrates each post with its author and comments, filtered by blogId", async () => {
    const result = await handler({});
    expect(result.statusCode).toBe(200);

    const [firstPost, secondPost] = JSON.parse(result.body);

    expect(firstPost.user).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      avatar: "ada.png",
      description: "d",
      location: "l",
      education: "e",
      work: "w",
      joined_date: "2020",
    });
    expect(firstPost.comments).toHaveLength(2);
    expect(firstPost.comments[0].user).toEqual({ firstName: "Grace", lastName: "Hopper", avatar: "grace.png" });
    expect(firstPost.comments[1].user).toBeNull();

    expect(secondPost.user).toBeNull();
    expect(secondPost.comments).toHaveLength(1);
  });

  test("marks isOwnComment true only for the requesting viewer's own comments", async () => {
    const token = auth.signToken({ id: "user-1", email: "a@b.com", username: "abee" });

    const anonymous = JSON.parse((await handler({})).body);
    expect(anonymous[0].comments.every((c) => c.isOwnComment === false)).toBe(true);

    const asUser1 = JSON.parse(
      (await handler({ headers: { Authorization: `Bearer ${token}` } })).body
    );
    const [firstPost, secondPost] = asUser1;
    expect(firstPost.comments.every((c) => c.isOwnComment === false)).toBe(true);
    expect(secondPost.comments[0].isOwnComment).toBe(true);
  });

  test("never leaks password fields or raw userId into the response", async () => {
    const result = await handler({});
    const body = result.body;

    expect(body).not.toMatch(/hash1|hash2/);
    expect(body).not.toContain('"userId"');
  });

  test("returns 500 when the database call fails", async () => {
    const { getAllBlogs } = require("../blogsRepo");
    getAllBlogs.mockImplementationOnce(() => Promise.reject(new Error("boom")));

    const result = await handler({});

    expect(result.statusCode).toBe(500);
  });
});
