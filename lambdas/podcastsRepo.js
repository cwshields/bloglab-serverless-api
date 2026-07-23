const { dynamo, scanAll, generateNumericId } = require("./dynamoUtil");

const PODCASTS_TABLE = process.env.PODCASTS_TABLE;
const PODCAST_COMMENTS_TABLE = process.env.PODCAST_COMMENTS_TABLE;

function getAllPodcasts() {
  return scanAll(PODCASTS_TABLE);
}

async function postComment({ episodeId, userId, body }) {
  const comment = {
    id: generateNumericId(),
    episodeId,
    userId,
    body,
    createdAt: new Date().toISOString(),
  };

  await dynamo
    .put({
      TableName: PODCAST_COMMENTS_TABLE,
      Item: comment,
      ConditionExpression: "attribute_not_exists(id)",
    })
    .promise();

  return comment;
}

async function getCommentById(commentId) {
  const result = await dynamo
    .get({
      TableName: PODCAST_COMMENTS_TABLE,
      Key: { id: commentId },
    })
    .promise();

  return result.Item;
}

async function deleteComment(commentId) {
  await dynamo
    .delete({
      TableName: PODCAST_COMMENTS_TABLE,
      Key: { id: commentId },
    })
    .promise();
}

async function updateComment(commentId, body) {
  const result = await dynamo
    .update({
      TableName: PODCAST_COMMENTS_TABLE,
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

// Queries the EpisodeIdIndex GSI once per episode (in parallel) instead of
// scanning the whole comments table and filtering in memory.
async function getCommentsByEpisodeIds(episodeIds) {
  const commentsByEpisodeId = new Map();

  await Promise.all(
    [...new Set(episodeIds)].map(async (episodeId) => {
      const result = await dynamo
        .query({
          TableName: PODCAST_COMMENTS_TABLE,
          IndexName: "EpisodeIdIndex",
          KeyConditionExpression: "episodeId = :episodeId",
          ExpressionAttributeValues: { ":episodeId": episodeId },
        })
        .promise();

      commentsByEpisodeId.set(episodeId, result.Items);
    })
  );

  return commentsByEpisodeId;
}

module.exports = {
  getAllPodcasts,
  getCommentsByEpisodeIds,
  postComment,
  getCommentById,
  deleteComment,
  updateComment,
};
