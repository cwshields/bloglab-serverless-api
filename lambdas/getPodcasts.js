const Responses = require("./API_Responses");
const { podcasts } = require("./podcasts");
const { podcastComments } = require("./podcastComments");
const users = require("./users");

exports.handler = async (event) => {
  console.log("event", event);

  //   if (!event.pathParameters || !event.pathParameters.ID) {
  //     // failed without an ID
  //     return Responses._400({ message: "missing the ID from the path" });
  //   }

  //   let ID = event.pathParameters.ID;

  if (podcasts /*[ID]*/) {
    // return the podcasts, hydrating each episode with its comments and each comment's author
    const hydrated = podcasts.map((podcast) => ({
      ...podcast,
      episodes: podcast.episodes.map((episode) => ({
        ...episode,
        comments: podcastComments
          .filter((c) => c.episodeId === episode.id)
          .map(({ userId, ...comment }) => {
            const user = users.find((u) => u.id === userId);
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
    return Responses._200(hydrated /*[ID]*/);
  }

  // if () {

  // } else {

  // }

  // failed as ID not in the podcasts
  return Responses._400({ message: "no ID in podcasts" });
};
