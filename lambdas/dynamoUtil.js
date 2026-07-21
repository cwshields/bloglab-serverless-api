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

module.exports = { dynamo, scanAll };
