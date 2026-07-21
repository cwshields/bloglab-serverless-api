const { dynamo, scanAll } = require("./dynamoUtil");

const PODCASTS_TABLE = process.env.PODCASTS_TABLE;
const PODCAST_COMMENTS_TABLE = process.env.PODCAST_COMMENTS_TABLE;

function getAllPodcasts() {
  return scanAll(PODCASTS_TABLE);
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

module.exports = { getAllPodcasts, getCommentsByEpisodeIds };
