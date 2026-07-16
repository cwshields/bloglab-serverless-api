const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const Responses = require("./API_Responses");
const { hashPassword, signToken, toPublicUser } = require("./auth");

const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.USERS_TABLE;

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return Responses._400({ message: "invalid JSON body" });
  }

  const { email, username, firstName, lastName, password } = body;

  if (!email || !username || !firstName || !lastName || !password) {
    return Responses._400({
      message: "email, username, firstName, lastName and password are required",
    });
  }

  if (password.length < 4) {
    return Responses._400({ message: "password must be at least 4 characters" });
  }

  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();

  try {
    const [emailMatch, usernameMatch] = await Promise.all([
      dynamo
        .query({
          TableName: TABLE,
          IndexName: "EmailIndex",
          KeyConditionExpression: "email = :email",
          ExpressionAttributeValues: { ":email": normalizedEmail },
        })
        .promise(),
      dynamo
        .query({
          TableName: TABLE,
          IndexName: "UsernameIndex",
          KeyConditionExpression: "username = :username",
          ExpressionAttributeValues: { ":username": normalizedUsername },
        })
        .promise(),
    ]);

    if (emailMatch.Items.length > 0 || usernameMatch.Items.length > 0) {
      return Responses._400({ message: "that username or email is already in use" });
    }

    const user = {
      id: uuidv4(),
      email: normalizedEmail,
      username: normalizedUsername,
      firstName,
      lastName,
      password: await hashPassword(password),
      avatar: `https://i.pravatar.cc/50?u=${encodeURIComponent(normalizedEmail)}`,
      joined_date: new Date().toISOString(),
    };

    await dynamo
      .put({
        TableName: TABLE,
        Item: user,
        ConditionExpression: "attribute_not_exists(id)",
      })
      .promise();

    return Responses._200({
      user: toPublicUser(user),
      token: signToken(user),
    });
  } catch (err) {
    console.error("register error", err);
    return Responses._500({ message: "failed to register user" });
  }
};
