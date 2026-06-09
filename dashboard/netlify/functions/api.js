const serverless = require('serverless-http');
const app = require('../../api/src/app');

exports.handler = serverless(app, {
  request: function (request, event) {
    request.url = event.path.replace('/.netlify/functions/api', '');
  }
});
