const Responses = require("./API_Responses");
const users = require("./users");

exports.handler = async (event) => {
  console.log("event", event);

    if (!event.pathParameters || !event.pathParameters.ID) {
      // failed without an ID
      return Responses._400({ message: "missing the ID from the path" });
    }

    let ID = event.pathParameters.ID;


  if (users /*[ID]*/) {
    // return the users
    return Responses._200(users /*[ID]*/);
  }

  // if () {

  // } else {

  // }

  // failed as ID not in the users
  return Responses._400({ message: "no ID in users" });
};
