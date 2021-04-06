const fs = require("fs");
const path = require("path");
const { httpRequest } = require('@dictadata/storage-junctions').utils;
const colors = require('colors');

let testFile = process.argv.length > 2 ? process.argv[2] : "";
let testName = process.argv.length > 3 ? process.argv[3] : "";

var request = {
  method: "GET",
  origin: "https://localhost:8089/node",
  timeout: 10000
};
request.headers = {
  'Accept': 'application / json',
  'User-Agent': "@dictadata/storage-node/testclient"
};

(async () => {
  console.log((testFile + "  " + testName).blue);

  let tf = fs.readFileSync(testFile, "utf-8");
  var config = JSON.parse(tf);

  let outputDir = path.dirname(testFile).replace("/test/", "/data/output/") + testName + "/" + config.name + "/";
  fs.mkdirSync(outputDir, { recursive: true });

  let exitCode = 0;
  for (let query of config.queries) {
    if (!testName || query.name.indexOf(testName) >= 0) {
      console.log(query.name.cyan);
      let request = Object.assign({}, config.request, query.request);
      let expected = Object.assign({}, config.expected, query.expected);
      let outputFile = outputDir + query.name + ".json";

      if (typeof request.data === "string")
        request.data = JSON.parse(fs.readFileSync(request.data, "utf-8"));

      exitCode = await submitQuery(request, expected, outputFile);
      if (exitCode !== 0)
        break;
    }
  }

  if (exitCode === 0)
    console.log(("Process exitCode = " + exitCode).blue);
  process.exitCode = exitCode;
})();


async function submitQuery(request, expected, outputFile) {
  //console.log("submitQuery");

  try {
    // make request
    let response = await httpRequest(request.url || '', request, JSON.stringify(request.data));

    if (response.data) {
      fs.writeFileSync(outputFile, response.data, "utf8");
    }

    // validate response agains expected expected
    if (Array.isArray(expected.statusCode) ? !expected.statusCode.includes(response.statusCode) : response.statusCode !== expected.statusCode) {
      console.log("  FAILED status ".bgRed + response.statusCode + " " + response.data + ", expected " + expected.statusCode);
      return 1;
    }
    if (expected.match_fail) {
      let data = (typeof response.data === "string") ? response.data : JSON.stringify(response.data);
      if (data.indexOf(expected.match_fail) >= 0) {
        console.log("  FAILED fail text found: ".bgRed + expected.match_fail);
        return 1;
      }
    }
    if (expected.match_success) {
      let data = (typeof response.data === "string") ? response.data : JSON.stringify(response.data);
      if (data.indexOf(expected.match_success) < 0) {
        console.log("  FAILED success text NOT found: ".bgRed + expected.match_success);
        return 1;
      }
    }

    //console.log("  Success")
    return 0;
  }
  catch (err) {
    if (err.response) {
      if (Array.isArray(expected.statusCode) && expected.statusCode.includes(err.response.statusCode))
        return 0;
      else if (err.response.statusCode === expected.statusCode)
        return 0;

      if (err.response.statusCode !== 500)
        console.log("FAILED status ".bgRed + err.response.statusCode + " " + err.response.data + ", expected " + expected.statusCode);
      else
        console.log("FAILED ".bgRed + err.stack);
      return 1;
    }
    else
      console.log("FAILED  ".bgRed + err.stack);
    return 1;
  }
}
