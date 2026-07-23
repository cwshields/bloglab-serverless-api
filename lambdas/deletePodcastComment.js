const Responses = require("./API_Responses");
const { getUserIdFromEvent } = require("./auth");
const { isUserAdmin } = require("./usersRepo");
const { getCommentById, deleteComment } = require("./podcastsRepo");

exports.handler = async (event) => {
  const userId = getUserIdFromEvent(event);
  if (!userId) {
    return Responses._401({ message: "authentication required" });
  }

  const commentId = Number(event.pathParameters?.commentId);
  if (!commentId) {
    return Responses._400({ message: "commentId is required" });
  }

  try {
    const comment = await getCommentById(commentId);
    if (!comment) {
      return Responses._404({ message: "comment not found" });
    }

    if (comment.userId !== userId && !(await isUserAdmin(userId))) {
      return Responses._403({ message: "you do not have permission to delete this comment" });
    }

    await deleteComment(commentId);
    return Responses._200({ id: commentId });
  } catch (err) {
    console.error("deletePodcastComment error", err);
    return Responses._500({ message: "failed to delete comment" });
  }
};
