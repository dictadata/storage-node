#!/usr/bin/env node
/**
 * test/st_nodeclient.js
 * 
 * Read a JSON file that defines the HTTP tests.
 * Run the tests defined in the "queries" array other properties define the default values.
 * See st_nodeclient_example.json. 
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { httpRequest } = require("@dictadata/storage-junctions").utils;
const colors = require('colors');

let testFile = process.argv.length > 2 ? process.argv[2] : "";
let testName = process.argv.length > 3 ? process.argv[3] : "";

var request = {
  method: "GET",
  origin: "https://localhost:8089/node",
  timeout: 8000
};
request.headers = {
  'Accept': 'application / json',
  'User-Agent': "@dictadata/storage/nodeclient 1.7.x"
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

    let results;
    if (response.data) {
      fs.writeFileSync(outputFile, response.data, "utf8");
      if (httpRequest.contentTypeIsJSON(response.headers["content-type"]))
        results = JSON.parse(response.data);
      else
        results = response.data;
    }

    // validate response agains expected expected
    if (Array.isArray(expected.statusCode) ? !expected.statusCode.includes(response.statusCode) : response.statusCode !== expected.statusCode) {
      console.log("  FAILED statusCode ".bgRed + response.statusCode + " " + response.data + ", expected " + expected.statusCode);
      return 1;
    }

    if (expected.resultCode) {
      if (Array.isArray(expected.resultCode) ? !expected.resultCode.includes(results.resultCode) : results.resultCode !== expected.resultCode) {
        console.log("  FAILED resultCode ".bgRed + results.resultCode + ", expected " + expected.resultCode);
        return 1;
      }
    }

    if (expected.match_fail) {
      if (response.data.indexOf(expected.match_fail) >= 0) {
        console.log("  FAILED fail text found: ".bgRed + expected.match_fail);
        return 1;
      }
    }

    if (expected.match_success) {
      if (response.data.indexOf(expected.match_success) < 0) {
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
