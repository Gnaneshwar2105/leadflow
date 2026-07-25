// Vercel's modern convention: any file under /api becomes a serverless
// function. This one wraps our existing Express app so every request
// (regardless of path) is handled by the same app instance.
const app = require('../src/server');
 
module.exports = app;
 