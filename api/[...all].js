const serverless = require('serverless-http');
const app = require('../server');
const connectDB = require('../config/db');

let handler;

module.exports = async (req, res) => {
  if (!handler) {
    await connectDB();
    handler = serverless(app);
  }
  return handler(req, res);
};
