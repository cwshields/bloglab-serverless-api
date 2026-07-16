const Responses = require("./API_Responses");
const listings = require("./listings");

exports.handler = async (event) => {
  console.log("event", event);

  //   if (!event.pathParameters || !event.pathParameters.ID) {
  //     // failed without an ID
  //     return Responses._400({ message: "missing the ID from the path" });
  //   }

  //   let ID = event.pathParameters.ID;

  if (listings /*[ID]*/) {
    // return the listings
    return Responses._200(listings /*[ID]*/);
  }

  // if () {

  // } else {

  // }

  // failed as ID not in the listings
  return Responses._400({ message: "no ID in listings" });
};
