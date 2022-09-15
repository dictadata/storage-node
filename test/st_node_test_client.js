/**
 * test/st_node_test_client.js
 *
 * Storage Node Test Client for testing storage-node servers.
 *
 * Read a JSON file that defines the HTTP tests.
 * Run the tests defined in the "queries" array other properties define the default values.
 *
 * See st_node_test_example.json.
 */
"use strict";

const { httpRequest, hasOwnProperty } = require("@dictadata/storage-junctions/utils");
const _compare = require("@dictadata/storage-junctions/test/lib/_compare");
const fs = require("fs");
const path = require("path");
const colors = require('colors');

let testFile = process.argv.length > 2 ? process.argv[ 2 ] : "";
let testName = process.argv.length > 3 ? process.argv[ 3 ] : "";

var request_defaults = {
  method: "GET",
  origin: "https://dev.dictadata.org:8089/node",
  timeout: 8000,
  headers: {
    'Accept': 'application / json',
    'User-Agent': "@dictadata/storage/nodeclient 1.7.x"
  }
};

(async () => {
  console.log((testFile + "  " + testName).blue);

  let tf = fs.readFileSync(testFile, "utf-8");
  let testQueries = JSON.parse(tf);

  let outputDir = path.dirname(testFile).replace("/test/", "/data/output/") + testName + "/" + testQueries.name + "/";
  fs.mkdirSync(outputDir, { recursive: true });

  let exitCode = 0;
  for (let query of testQueries.queries) {
    if (!testName || query.name.indexOf(testName) >= 0) {
      console.log(query.name.cyan);
      let request = Object.assign({}, request_defaults, testQueries.request, query.request);
      let expected = Object.assign({}, testQueries.expected, query.expected);
      let outputFile = outputDir + query.name + ".results";

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
    let retCode = 0;
    let url = request.url || '';
    if (url.includes(':')) url = encodeURIComponent(url);

    // make request
    let response = await httpRequest(url, request, JSON.stringify(request.data));
    console.log(response.statusCode);

    let results;
    let isJSON = httpRequest.contentTypeIsJSON(response.headers[ "content-type" ]);
    if (response.data) {
      if (isJSON) {
        outputFile += ".json";
        results = JSON.parse(response.data);
      }
      else {
        outputFile += ".txt";
        results = response.data;
      }
    }

    // validate HTTP statusCode against expected
    if (Array.isArray(expected.statusCode) ? !expected.statusCode.includes(response.statusCode) : response.statusCode !== expected.statusCode) {
      console.log("  FAILED statusCode ".bgRed + response.statusCode + " " + response.data + ", expected " + expected.statusCode);
      retCode = 1;
    }
    // test query resultCode against expected
    if (expected.resultCode) {
      if (Array.isArray(expected.resultCode) ? !expected.resultCode.includes(results.resultCode) : results.resultCode !== expected.resultCode) {
        console.log("  FAILED resultCode ".bgRed + results.resultCode + ", expected " + expected.resultCode);
        retCode = 1;
      }
    }
    //
    if (expected.match_fail) {
      if (response.data.indexOf(expected.match_fail) >= 0) {
        console.log("  FAILED fail text found: ".bgRed + expected.match_fail);
        retCode = 1;
      }
    }
    if (expected.match_success) {
      if (response.data.indexOf(expected.match_success) < 0) {
        console.log("  FAILED success text NOT found: ".bgRed + expected.match_success);
        retCode = 1;
      }
    }

    if (retCode === 0 && response.data) {
      // compare output files to expected
      console.log("output: ", outputFile);

      fs.writeFileSync(outputFile, isJSON ? JSON.stringify(results, null, "  ") : results, "utf8");

      if (isJSON) {
        let expected_output = outputFile.replace("output", "expected");
        let compareValues = hasOwnProperty(expected, "compareValues") ? expected.compareValues : 2;
        retCode = _compare(expected_output, outputFile, compareValues);
      }
    }

    return retCode;
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
    }
    else {
      console.log("FAILED  ".bgRed + err.message);
    }

    return 1;
  }
}
