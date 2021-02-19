const fs = require("fs");
const axios = require('axios').default;

let testName = process.argv.length > 2 ? process.argv[2] : "";

(async () => {
  let l = fs.readFileSync("./test/launch_http.json", "utf-8");
  // let lj = l.replace(/\/\/.*/g, "");  // remove comments, also removes url part after "http://"
  var launch = JSON.parse(l);

  for (let config of launch.configurations) {
    if (!testName || config.name.indexOf(testName) >= 0) {
      console.log(config.name);
      console.log(config.request.url);

      if (config.type === "HTTP/1.1" && config.request && config.response) {
        let exitcode = runTest(config.request, config.response);
        if (exitcode !== 0)
          break;
      }
    }
  }
})();

async function runTest(request, response) {
 
  try {
    // set request defaults
    if (!request.hasOwnProperty("headers"))
      request.headers = {};
    if (!request.headers.hasOwnProperty("User-Agent"))
      request.headers["User-Agent"] = "@dictadata/storage-node";
    if (!request.hasOwnProperty("timeout"))
      request.timerout = 10000;
  
    // make request
    let results = await axios.request(request);

    // validate results agains expected response
    if (results.status !== response.status) {
      console.log("FAILED status " + results.status + " expected " + response.status);
      return 1;
    }
    if (response.statusText && results.statusText !== response.statusText) {
      console.log("FAILED statusText " + results.statusText + " expected " + response.statusText);
      return 1;
    }
    if (response.body_fail && response.data.indexOf(response.body_fail) >= 0) {
      console.log("FAILED fail text found: " + response.body_fail);
      return 1;
    }
    if (response.body_success && response.data.indexOf(response.body_success) < 0) {
      console.log("FAILED success text NOT found: " + response.body_success);
      return 1;
    }
    
    console.log("SUCCESS")
    return 0;
  }
  catch (err) {
    console.log(err.message);
    return 1;
  }
}
