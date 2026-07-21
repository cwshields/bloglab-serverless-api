const Responses = require("./API_Responses");
const { scanAll } = require("./dynamoUtil");

const LISTINGS_TABLE = process.env.LISTINGS_TABLE;

exports.handler = async (event) => {
  try {
    const listings = await scanAll(LISTINGS_TABLE);
    return Responses._200(listings);
  } catch (err) {
    console.error("getListings error", err);
    return Responses._500({ message: "failed to get listings" });
  }
};
