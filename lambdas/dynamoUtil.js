const AWS = require("aws-sdk");

const dynamo = new AWS.DynamoDB.DocumentClient();

async function scanAll(tableName) {
  const items = [];
  let lastEvaluatedKey;

  do {
    const result = await dynamo
      .scan({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      })
      .promise();

    items.push(...result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

// Comment tables key on a numeric id with no auto-increment in DynamoDB;
// millisecond timestamp + random suffix keeps ids ordered and collision-free.
function generateNumericId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

module.exports = { dynamo, scanAll, generateNumericId };
