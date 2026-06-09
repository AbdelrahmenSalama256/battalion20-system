const serverless = require('serverless-http');
const app = require('../../api/src/app');

exports.handler = serverless(app);
