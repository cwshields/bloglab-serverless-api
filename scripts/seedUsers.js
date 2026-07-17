/*
 * Migrates the static lambdas/users.js seed data (plus the three demo
 * login accounts referenced by bloglab-web's LoginModal popover) into the
 * DynamoDB users table created by serverless.yml.
 *
 * Usage (from the serverless-api directory, after `serverless deploy`):
 *   AWS_PROFILE=serverlessUser node scripts/seedUsers.js [stage]
 *
 * Defaults to stage "dev" to match serverless.yml's default stage.
 */
const AWS = require("aws-sdk");
const bcrypt = require("bcryptjs");
const seedUsers = require("../lambdas/users");

const stage = process.argv[2] || "dev";
const TABLE = `myserverlessproject-users-${stage}`;
const REGION = "eu-west-1";
const PROFILE = process.env.AWS_PROFILE || "serverlessUser";

AWS.config.update({
  region: REGION,
  credentials: new AWS.SharedIniFileCredentials({ profile: PROFILE }),
});

const dynamo = new AWS.DynamoDB.DocumentClient();

// Matches bloglab-web/src/data/demoUsers.ts, so the LoginModal's
// "Need help logging in?" credential hints keep working against the real API.
const demoAccounts = [
  {
    id: "demo-admin-cwshields",
    firstName: "Admin",
    lastName: "User",
    username: "cwshields",
    email: "cwshields@bloglab.dev",
    password: "1234",
    avatar: "https://i.pravatar.cc/50?img=51",
    is_admin: true,
    is_employee: true,
    joined_date: "Jan 29, 2023",
  },
  {
    id: "demo-employee-mpirouet1",
    firstName: "Employee",
    lastName: "User",
    username: "mpirouet1",
    email: "mpirouet1@bloglab.dev",
    password: "1234",
    avatar: "https://i.pravatar.cc/50?img=11",
    is_admin: false,
    is_employee: true,
    joined_date: "Mar 19, 2024",  
  },
  {
    id: "demo-customer-mhewertsonl",
    firstName: "Customer",
    lastName: "User",
    username: "mhewertsonl",
    email: "mhewertsonl@bloglab.dev",
    password: "1234",
    is_admin: false,
    is_employee: false,
    avatar: "https://i.pravatar.cc/50?img=35",
    joined_date: "Feb 7, 2024",
  },
];

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  const allUsers = [...seedUsers, ...demoAccounts].map((user) => ({
    ...user,
    email: user.email.toLowerCase(),
    username: user.username.toLowerCase(),
  }));

  // demoAccounts already carry a bcrypt-compatible "1234" password once hashed;
  // seedUsers already store a bcrypt hash of "1234", so only hash the plaintext ones.
  for (const user of allUsers) {
    if (!user.password.startsWith("$2")) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  }

  const batches = chunk(allUsers, 25);
  let written = 0;

  for (const batch of batches) {
    await dynamo
      .batchWrite({
        RequestItems: {
          [TABLE]: batch.map((Item) => ({ PutRequest: { Item } })),
        },
      })
      .promise();
    written += batch.length;
    console.log(`wrote ${written}/${allUsers.length} users`);
  }

  console.log(`done. seeded ${allUsers.length} users into ${TABLE}`);
}

main().catch((err) => {
  console.error("seed failed", err);
  process.exit(1);
});
