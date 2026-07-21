const AWS = require("aws-sdk");
const Responses = require("./API_Responses");
const { toPublicUser } = require("./auth");

const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.USERS_TABLE;

exports.handler = async (event) => {
  if (!event.pathParameters || !event.pathParameters.ID) {
    return Responses._400({ message: "missing the ID from the path" });
  }

  const ID = event.pathParameters.ID;

  try {
    const result = await dynamo
      .get({
        TableName: TABLE,
        Key: { id: ID },
      })
      .promise();

    if (!result.Item) {
      return Responses._400({ message: "no ID in users" });
    }

    return Responses._200(toPublicUser(result.Item));
  } catch (err) {
    console.error("getUsers error", err);
    return Responses._500({ message: "failed to get user" });
  }
};
