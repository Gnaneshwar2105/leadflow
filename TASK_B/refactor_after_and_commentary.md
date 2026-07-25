# Task B — Refactor: Before → After, with Commentary

The "after" is not reproduced in full here — it's the real, current code at
`/backend/src/controllers/leadController.js`, `/backend/src/middleware/auth.js`,
and `/backend/src/routes/leadRoutes.js` in this repo (Task A). This document
is the diff explanation: what changed, and specifically why each change
closes one of the gaps identified in `assessment.md`.

## 1. Secrets

**Before:** `MONGO_URI` and `JWT_SECRET` hardcoded as string literals in
`refactor_before.js`, committed to the repo.

**After:** both are read from `process.env` (`config/db.js`, `server.js`),
sourced from a `.env` file that is git-ignored, with `.env.example` committed
instead so the shape is documented without the values being real. Nothing
about the code's *behavior* changed here — this is a pure extraction, which
is exactly why it's safe to do first and in isolation from the rest of the
refactor.

## 2. Direct database access from the frontend

**Before:** the frontend held a Mongo Data API key and queried the database
directly (see the comment block at the bottom of `refactor_before.js`).

**After:** the frontend (`frontend/src/api/client.js`) holds no credential
of any kind. Every request goes to the Express API over `fetch`, carrying
only a short-lived JWT obtained via `/api/auth/login`. The database
connection string exists in exactly one place: the backend's environment.
This is the change that makes every other permission check possible —
you can't enforce "a member can only see their own leads" against a client
that's allowed to query the database directly, no matter how careful the
UI is, because the real data path bypasses the UI entirely.

## 3. Business logic in route handlers → layered structure

**Before:** `refactor_before.js` is one file: routing, auth "checking",
database queries, and response shaping, all inline, with the `db` connection
itself managed ad hoc at module scope.

**After:** split into the three layers visible in Task A's `/backend/src`:

- `routes/leadRoutes.js` — only wires paths to middleware and controller
  functions. No logic.
- `middleware/auth.js` — `requireAuth` verifies the JWT and loads the real
  user; `requireRole(...)` is a reusable gate any route can opt into. This
  replaces the ad hoc `getUserIdFromRequest` that was duplicated per-route
  and never checked role at all.
- `controllers/leadController.js` — the actual business rules: the
  member-vs-admin visibility scoping (`scopeToUser`), the activity trail on
  every mutation, and the ownership check before letting a member touch a
  lead assigned to someone else. This is the concrete example of the bug
  class described in the assessment: in the "before" version, *any*
  logged-in user could `DELETE /leads/:id` on *any* lead, because there was
  no seam where an admin-only check could even be attached. Adding the
  layer is what makes `requireRole('admin')` possible to bolt onto the
  delete route as a one-line addition, instead of a change that has to be
  re-derived and re-typed correctly inside every handler that needs it.

## 4. Error handling

**Before:** inconsistent (`res.status(401).send('no')`), and the PATCH route
has no try/catch at all — an invalid `:id` throws inside `new ObjectId(...)`
and crashes the request with an unhandled exception.

**After:** every controller function is `async` and passes errors to
`next(err)`; a single `middleware/errorHandler.js` turns Mongoose
`ValidationError` into `400`, `CastError` (an invalid id — the exact bug
above) into `400` instead of a crash, duplicate-key errors into `409`, and
anything unexpected into a `500` with a message but no stack trace leaked
to the client.

## 5. Tests

**Before:** none.

**After:** `tests/auth.test.js` and `tests/leads.test.js`. Notably, the test
`'a member cannot see or modify a lead assigned to someone else'` is a test
that could not have even been written against the "before" code, because
there was no per-lead ownership concept to assert against — the test suite
and the layered architecture had to arrive together.

## What I'd flag if I were reviewing this as a PR

The refactor changes real behavior for end users (members lose visibility
into leads that were previously exposed to them by the leaky API key). In a
real migration I'd ship that as a called-out change, not bundle it silently
into a "just a refactor" PR — the migration plan's Month 1 section says this
explicitly, and it's worth repeating here because it's the kind of thing that
looks like a technicality until a user notices data disappeared and files a
support ticket.
