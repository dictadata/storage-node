/**
 * convert_tracts
 *
 * Convert abc.results.json files from pre 0.9.74 format to post 0.9.74 format.
 */
"use strict";

const fs = require('fs');
const path = require('path');
const { typeOf } = require('@dictadata/storage-junctions/utils');

(async () => {
  let retCode = 0;

  let resultsFile = process.argv[ 2 ];
  console.log(resultsFile);

  let resultsText = fs.readFileSync(resultsFile, 'utf-8');
  let results = JSON.parse(resultsText);

  if (typeOf(results) === "array") {
    console.log("already reformatted");
    return retCode;
  }

  let p = path.parse(resultsFile);

  let data = [];

  for (let [ urn, entry ] of Object.entries(results.data)) {
    data.push(entry);
  }
  results.data = data;

  /*
  delete p.base;
  p.name = p.name + "(1)";
  let fn = path.format(p);
  console.log(fn);
*/

  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2), { encoding: 'utf-8', flag: 'w' });

  return retCode;
})();