const { dynamo, scanAll, generateNumericId } = require("./dynamoUtil");

const BLOGS_TABLE = process.env.BLOGS_TABLE;
const BLOG_COMMENTS_TABLE = process.env.BLOG_COMMENTS_TABLE;

function getAllBlogs() {
  return scanAll(BLOGS_TABLE);
}

async function postComment({ blogId, userId, body }) {
  const comment = {
    id: generateNumericId(),
    blogId,
    userId,
    body,
    createdAt: new Date().toISOString(),
  };

  await dynamo
    .put({
      TableName: BLOG_COMMENTS_TABLE,
      Item: comment,
      ConditionExpression: "attribute_not_exists(id)",
    })
    .promise();

  return comment;
}

async function getCommentById(commentId) {
  const result = await dynamo
    .get({
      TableName: BLOG_COMMENTS_TABLE,
      Key: { id: commentId },
    })
    .promise();

  return result.Item;
}

async function deleteComment(commentId) {
  await dynamo
    .delete({
      TableName: BLOG_COMMENTS_TABLE,
      Key: { id: commentId },
    })
    .promise();
}

async function updateComment(commentId, body) {
  const result = await dynamo
    .update({
      TableName: BLOG_COMMENTS_TABLE,
      Key: { id: commentId },
      UpdateExpression: "SET body = :body, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":body": body,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    })
    .promise();

  return result.Attributes;
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

module.exports = {
  getAllBlogs,
  getCommentsByBlogIds,
  postComment,
  getCommentById,
  deleteComment,
  updateComment,
};
