const Responses = require("./API_Responses");
const { getAllPodcasts, getCommentsByEpisodeIds } = require("./podcastsRepo");
const { getUsersByIds } = require("./usersRepo");

exports.handler = async (event) => {
  try {
    const podcasts = await getAllPodcasts();
    const episodeIds = podcasts.flatMap((podcast) => podcast.episodes.map((episode) => episode.id));
    const commentsByEpisodeId = await getCommentsByEpisodeIds(episodeIds);
    const allComments = [...commentsByEpisodeId.values()].flat();

    const usersById = await getUsersByIds(allComments.map((comment) => comment.userId));

    const hydrated = podcasts.map((podcast) => ({
      ...podcast,
      episodes: podcast.episodes.map((episode) => ({
        ...episode,
        comments: (commentsByEpisodeId.get(episode.id) || []).map(({ userId, ...comment }) => {
          const user = usersById.get(userId);
          return {
            ...comment,
            user: user
              ? {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  avatar: user.avatar,
                }
              : null,
          };
        }),
      })),
    }));

    return Responses._200(hydrated);
  } catch (err) {
    console.error("getPodcasts error", err);
    return Responses._500({ message: "failed to get podcasts" });
  }
};
