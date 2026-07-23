process.env.JWT_SECRET = "test-secret";

const mockCommentsByEpisodeId = new Map([
  [10, [{ id: 200, episodeId: 10, userId: "user-1", body: "Great episode!" }]],
  [11, [{ id: 201, episodeId: 11, userId: "no-such-user", body: "From a deleted user" }]],
]);

jest.mock("../podcastsRepo", () => ({
  getAllPodcasts: jest.fn(() =>
    Promise.resolve([
      {
        id: 1,
        name: "First podcast",
        episodes: [
          { id: 10, name: "Ep 1" },
          { id: 11, name: "Ep 2" },
        ],
      },
    ])
  ),
  getCommentsByEpisodeIds: jest.fn(() => Promise.resolve(mockCommentsByEpisodeId)),
}));

const mockUsersById = new Map([
  ["user-1", { id: "user-1", firstName: "Ada", lastName: "Lovelace", avatar: "ada.png" }],
]);

jest.mock("../usersRepo", () => ({
  getUsersByIds: jest.fn(() => Promise.resolve(mockUsersById)),
}));

const auth = require("../auth");
const { handler } = require("../getPodcasts");

describe("getPodcasts handler", () => {
  test("hydrates each episode with its comments and each comment's author", async () => {
    const result = await handler({});
    expect(result.statusCode).toBe(200);

    const [podcast] = JSON.parse(result.body);
    const [firstEpisode, secondEpisode] = podcast.episodes;

    expect(firstEpisode.comments).toHaveLength(1);
    expect(firstEpisode.comments[0].user).toEqual({ firstName: "Ada", lastName: "Lovelace", avatar: "ada.png" });

    expect(secondEpisode.comments).toHaveLength(1);
    expect(secondEpisode.comments[0].user).toBeNull();
  });

  test("marks isOwnComment true only for the requesting viewer's own comments", async () => {
    const token = auth.signToken({ id: "user-1", email: "a@b.com", username: "abee" });

    const anonymous = JSON.parse((await handler({})).body);
    expect(anonymous[0].episodes[0].comments[0].isOwnComment).toBe(false);

    const asUser1 = JSON.parse(
      (await handler({ headers: { Authorization: `Bearer ${token}` } })).body
    );
    expect(asUser1[0].episodes[0].comments[0].isOwnComment).toBe(true);
    expect(asUser1[0].episodes[1].comments[0].isOwnComment).toBe(false);
  });

  test("never leaks raw userId into the response", async () => {
    const result = await handler({});
    expect(result.body).not.toContain('"userId"');
  });

  test("returns 500 when the database call fails", async () => {
    const { getAllPodcasts } = require("../podcastsRepo");
    getAllPodcasts.mockImplementationOnce(() => Promise.reject(new Error("boom")));

    const result = await handler({});

    expect(result.statusCode).toBe(500);
  });
});
