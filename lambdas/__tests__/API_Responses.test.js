const Responses = require("../API_Responses");

describe("API_Responses", () => {
  const cases = [
    ["_200", 200],
    ["_400", 400],
    ["_401", 401],
    ["_500", 500],
  ];

  test.each(cases)("%s returns statusCode %i with CORS headers and JSON body", (method, statusCode) => {
    const result = Responses[method]({ message: "hello" });

    expect(result.statusCode).toBe(statusCode);
    expect(result.headers["Content-Type"]).toBe("application/json");
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(JSON.parse(result.body)).toEqual({ message: "hello" });
  });

  test.each(cases)("%s defaults body to an empty array when called with no data", (method) => {
    const result = Responses[method]();

    expect(JSON.parse(result.body)).toEqual([]);
  });
});
