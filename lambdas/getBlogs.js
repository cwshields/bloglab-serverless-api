const Responses = require("./API_Responses");
const { getAllBlogs, getCommentsByBlogIds } = require("./blogsRepo");
const { getUsersByIds } = require("./usersRepo");

exports.handler = async (event) => {
  try {
    const blogs = await getAllBlogs();
    const commentsByBlogId = await getCommentsByBlogIds(blogs.map((post) => post.id));
    const allComments = [...commentsByBlogId.values()].flat();

    const usersById = await getUsersByIds([
      ...blogs.map((post) => post.userId),
      ...allComments.map((comment) => comment.userId),
    ]);

    const hydrated = blogs.map(({ userId, ...post }) => {
      const user = usersById.get(userId);
      const comments = (commentsByBlogId.get(post.id) || []).map(({ userId: commentUserId, ...comment }) => {
        const commentUser = usersById.get(commentUserId);
        return {
          ...comment,
          user: commentUser
            ? {
                firstName: commentUser.firstName,
                lastName: commentUser.lastName,
                avatar: commentUser.avatar,
              }
            : null,
        };
      });
      return {
        ...post,
        comments,
        user: user
          ? {
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar,
              description: user.description,
              location: user.location,
              education: user.education,
              work: user.work,
              joined_date: user.joined_date,
            }
          : null,
      };
    });

    return Responses._200(hydrated);
  } catch (err) {
    console.error("getBlogs error", err);
    return Responses._500({ message: "failed to get blogs" });
  }
};
