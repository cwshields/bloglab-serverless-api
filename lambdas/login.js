const AWS = require("aws-sdk");
const Responses = require("./API_Responses");
const { comparePassword, signToken, toPublicUser } = require("./auth");

const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.USERS_TABLE;

async function findUserByIdentifier(identifier) {
  const normalized = identifier.toLowerCase();

  const byEmail = await dynamo
    .query({
      TableName: TABLE,
      IndexName: "EmailIndex",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": normalized },
    })
    .promise();

  if (byEmail.Items.length > 0) {
    return byEmail.Items[0];
  }

  const byUsername = await dynamo
    .query({
      TableName: TABLE,
      IndexName: "UsernameIndex",
      KeyConditionExpression: "username = :username",
      ExpressionAttributeValues: { ":username": normalized },
    })
    .promise();

  return byUsername.Items[0];
}

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return Responses._400({ message: "invalid JSON body" });
  }

  const { identifier, password } = body;

  if (!identifier || !password) {
    return Responses._400({ message: "identifier and password are required" });
  }

  try {
    const user = await findUserByIdentifier(identifier);

    if (!user || !(await comparePassword(password, user.password))) {
      return Responses._401({ message: "invalid username/email or password" });
    }

    return Responses._200({
      user: toPublicUser(user),
      token: signToken(user),
    });
  } catch (err) {
    console.error("login error", err);
    return Responses._500({ message: "failed to log in" });
  }
};
