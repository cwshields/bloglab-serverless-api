const Responses = require("./API_Responses");
const { getUserIdFromEvent } = require("./auth");
const { getCommentById, updateComment } = require("./podcastsRepo");

exports.handler = async (event) => {
  const userId = getUserIdFromEvent(event);
  if (!userId) {
    return Responses._401({ message: "authentication required" });
  }

  const commentId = Number(event.pathParameters?.commentId);
  if (!commentId) {
    return Responses._400({ message: "commentId is required" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return Responses._400({ message: "invalid JSON body" });
  }

  const { body } = payload;
  if (!body) {
    return Responses._400({ message: "body is required" });
  }

  try {
    const comment = await getCommentById(commentId);
    if (!comment) {
      return Responses._404({ message: "comment not found" });
    }

    if (comment.userId !== userId) {
      return Responses._403({ message: "you do not have permission to edit this comment" });
    }

    const updated = await updateComment(commentId, body);
    return Responses._200(updated);
  } catch (err) {
    console.error("editPodcastComment error", err);
    return Responses._500({ message: "failed to edit comment" });
  }
};
