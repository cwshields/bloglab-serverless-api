const Responses = require("./API_Responses");
const { blogs } = require('./blogs')
const { blogComments } = require('./blogComments')
const users = require('./users')

exports.handler = async (event) => {
  console.log("event", event);

  // if (!event.pathParameters || !event.pathParameters.ID) {
  //   // failed without an ID
  //   return Responses._400({ message: "missing the ID from the path" });
  // }

  // let ID = event.pathParameters.ID;

  if (blogs/*[ID]*/) {
    // return the blogs, hydrated with the author's current user info
    const hydrated = blogs.map(({ userId, ...post }) => {
      const user = users.find((u) => u.id === userId);
      const comments = blogComments
        .filter((c) => c.blogId === post.id)
        .map(({ userId: commentUserId, ...comment }) => {
          const commentUser = users.find((u) => u.id === commentUserId);
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
    return Responses._200(hydrated/*[ID]*/);
  }

  // if () {

  // } else {

  // }

  // failed as ID not in the blogs
  return Responses._400({ message: "no ID in blogs" });
};

