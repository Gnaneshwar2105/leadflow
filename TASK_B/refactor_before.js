/**
 * refactor_before.js
 *
 * This is what LeadFlow's "leads" feature plausibly looked like as a
 * two-day MVP, before Task A's rebuild. It is deliberately bad in the
 * specific ways Task B describes: business logic in the route handler,
 * a hardcoded secret, no validation, no permission checks, and no tests.
 *
 * It is NOT wired into the real app - it exists purely as the "before"
 * half of the refactor demo. See refactor_after_and_commentary.md for
 * the line-by-line diff against the real, current code in
 * /backend/src/controllers/leadController.js.
 */

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Problem 1: secrets hardcoded directly in source, committed to the repo.
const MONGO_URI = 'mongodb+srv://admin:Sup3rSecret!@cluster0.mongodb.net/leadflow';
const JWT_SECRET = 'leadflow-prod-secret-2024';

let db; // Problem: connection opened lazily, no pooling/lifecycle management
async function getDb() {
  if (!db) {
    const client = await MongoClient.connect(MONGO_URI);
    db = client.db('leadflow');
  }
  return db;
}

// Problem 2: "auth" is a decoded-but-unverified read of a header, not real
// middleware, duplicated ad hoc wherever someone remembered to add it.
function getUserIdFromRequest(req) {
  const token = req.headers['x-user-token'];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.userId; // role is never even checked here
  } catch {
    return null;
  }
}

// GET /leads - business logic, DB access, and response shaping all inline.
// No pagination, no filtering, no permission scoping - every logged-in
// user (any role) gets every lead in the database.
router.get('/leads', async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).send('no'); // Problem: inconsistent, unhelpful error shape
    return;
  }
  const database = await getDb();
  const leads = await database.collection('leads').find({}).toArray();
  res.send(leads); // Problem: raw Mongo documents sent straight to the client
});

// PATCH /leads/:id - no validation on `status`, no check that the caller
// is allowed to touch this lead, no activity trail, and a bug: `id` is
// passed to ObjectId without validating it's a valid ObjectId string,
// so a malformed id crashes the process with an uncaught exception
// (this route has no try/catch, and there's no global error handler).
router.patch('/leads/:id', async (req, res) => {
  const database = await getDb();
  await database.collection('leads').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: req.body.status } }
  );
  res.send('ok');
});

// DELETE /leads/:id - deletable by anyone with a valid token, admin or not.
router.delete('/leads/:id', async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).send('no');
    return;
  }
  const database = await getDb();
  await database.collection('leads').deleteOne({ _id: new ObjectId(req.params.id) });
  res.send('ok');
});

module.exports = router;

/**
 * The other half of Problem 1/2 lived in the frontend, not shown as a full
 * file here for brevity, but it looked like this - a Mongo Atlas Data API
 * key embedded directly in client-side JS, called straight from a React
 * component with no server in between at all:
 *
 *   const MONGO_DATA_API_KEY = 'sk_live_9f8a...'; // shipped to every browser
 *   fetch('https://data.mongodb-api.com/app/leadflow/endpoint/data/v1/action/find', {
 *     headers: { 'api-key': MONGO_DATA_API_KEY },
 *     method: 'POST',
 *     body: JSON.stringify({ collection: 'leads', database: 'leadflow' }),
 *   });
 *
 * Anyone with browser dev tools could read that key and use it to read or
 * write any collection in the database directly - there was no server-side
 * gatekeeper at all for this path. This is fixed in Task A simply by there
 * being no such key anywhere in the frontend: every write goes through the
 * Express API, which is the only thing holding a database credential.
 */
