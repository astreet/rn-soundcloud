/**
 * @providesModule SCClient
 */

var CLIENT_ID = "bde272e750aa8584833ec1fbd07bda2b";
var OAUTH_TOKEN = ""

function get(path, params) {
  var queryParams = "oauth_token=" + OAUTH_TOKEN;
  for (var param in params) {
    queryParams += "&" + param + "=" + params[param];
  }
  return fetch("http://api.soundcloud.com" + path + "?" + queryParams)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed network request: status " + response.status);
        }
        return response;
      })
      .then((response) => response.json() );
}

function getRaw(uri) {
  var queryParams = "oauth_token=" + OAUTH_TOKEN;
  return fetch(uri + "&" + queryParams)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed network request: status " + response.status);
        }
        return response;
      })
      .then((response) => response.json() );
}

module.exports = {
  get: get,
  getRaw: getRaw,
}
