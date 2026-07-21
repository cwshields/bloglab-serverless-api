process.env.LISTINGS_TABLE = "listings-table";

jest.mock("../dynamoUtil", () => ({
  scanAll: jest.fn(),
}));

const { scanAll } = require("../dynamoUtil");
const { handler } = require("../getListings");

describe("getListings handler", () => {
  beforeEach(() => {
    scanAll.mockReset();
  });

  test("returns 200 with all listings", async () => {
    const listings = [{ id: 1, header: "First listing" }];
    scanAll.mockResolvedValue(listings);

    const result = await handler({});

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(listings);
    expect(scanAll).toHaveBeenCalledWith("listings-table");
  });

  test("returns 500 when the database call fails", async () => {
    scanAll.mockRejectedValue(new Error("boom"));

    const result = await handler({});

    expect(result.statusCode).toBe(500);
  });
});
