const AWS = require("aws-sdk");

const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.USERS_TABLE;

const PUBLIC_ATTRIBUTES = [
  "id",
  "firstName",
  "lastName",
  "avatar",
  "description",
  "location",
  "education",
  "work",
  "joined_date",
];

const PROJECTION_EXPRESSION = PUBLIC_ATTRIBUTES.map((_, i) => `#a${i}`).join(", ");
const EXPRESSION_ATTRIBUTE_NAMES = PUBLIC_ATTRIBUTES.reduce((acc, name, i) => {
  acc[`#a${i}`] = name;
  return acc;
}, {});

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Batch-fetches users by id, returning a Map<id, publicUser> (password never leaves Dynamo).
async function getUsersByIds(ids) {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const usersById = new Map();
  if (uniqueIds.length === 0) return usersById;

  for (const batch of chunk(uniqueIds, 100)) {
    let keys = batch.map((id) => ({ id }));

    while (keys.length > 0) {
      const result = await dynamo
        .batchGet({
          RequestItems: {
            [TABLE]: {
              Keys: keys,
              ProjectionExpression: PROJECTION_EXPRESSION,
              ExpressionAttributeNames: EXPRESSION_ATTRIBUTE_NAMES,
            },
          },
        })
        .promise();

      for (const user of result.Responses?.[TABLE] || []) {
        usersById.set(user.id, user);
      }

      keys = result.UnprocessedKeys?.[TABLE]?.Keys || [];
    }
  }

  return usersById;
}

module.exports = { getUsersByIds };
