const Responses = require("./API_Responses");
const { getUserIdFromEvent } = require("./auth");
const { postComment } = require("./blogsRepo");

exports.handler = async (event) => {
  const userId = getUserIdFromEvent(event);
  if (!userId) {
    return Responses._401({ message: "authentication required" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return Responses._400({ message: "invalid JSON body" });
  }

  const { blogId, body } = payload;

  if (blogId === undefined || blogId === null || !body) {
    return Responses._400({ message: "blogId and body are required" });
  }

  try {
    const comment = await postComment({ blogId, userId, body });
    return Responses._200(comment);
  } catch (err) {
    console.error("postBlogComment error", err);
    return Responses._500({ message: "failed to post comment" });
  }
};
