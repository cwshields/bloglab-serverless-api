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
