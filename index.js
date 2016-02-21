

include('./lib/base.js');
include('./lib/proxy.js');


function include(path) {
  var obj = require(path);

  for (var n in obj) {
    if (module.exports[n]) throw new Error("冲突");
    module.exports[n] = obj[n];
  }
}