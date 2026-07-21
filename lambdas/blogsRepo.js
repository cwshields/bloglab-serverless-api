const { dynamo, scanAll } = require("./dynamoUtil");

const BLOGS_TABLE = process.env.BLOGS_TABLE;
const BLOG_COMMENTS_TABLE = process.env.BLOG_COMMENTS_TABLE;

function getAllBlogs() {
  return scanAll(BLOGS_TABLE);
}

// Queries the BlogIdIndex GSI once per blog (in parallel) instead of
// scanning the whole comments table and filtering in memory.
async function getCommentsByBlogIds(blogIds) {
  const commentsByBlogId = new Map();

  await Promise.all(
    [...new Set(blogIds)].map(async (blogId) => {
      const result = await dynamo
        .query({
          TableName: BLOG_COMMENTS_TABLE,
          IndexName: "BlogIdIndex",
          KeyConditionExpression: "blogId = :blogId",
          ExpressionAttributeValues: { ":blogId": blogId },
        })
        .promise();

      commentsByBlogId.set(blogId, result.Items);
    })
  );

  return commentsByBlogId;
}

module.exports = { getAllBlogs, getCommentsByBlogIds };
