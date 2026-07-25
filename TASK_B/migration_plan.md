# Task B — Phased Migration Plan

Constraint: it serves real customers and cannot go down. So nothing here is a
big-bang rewrite — every phase ships behind normal deploys, and the app stays
functional throughout.

## Week 1 — stop the bleeding (no architecture change yet)

- Rotate the DB credential and JWT secret; move both to environment variables
  read at runtime (`.env`, loaded via `dotenv`, `.env` added to `.gitignore`).
  Scrub the old values from git history with `git filter-repo` — a force-push
  is disruptive but this is the one case where it's worth the coordination
  cost, because a secret in history is a secret that's still leaked.
- Kill the frontend's direct database access. Point every write the frontend
  makes at a temporary "pass-through" Express endpoint that does nothing but
  forward the request server-side — this removes the client-exposed
  credential immediately without waiting for the full API to be built out.
- Add a global error handler so raw Mongo/stack-trace errors stop reaching
  the client (`middleware/errorHandler.js` in the Task A codebase is this,
  built out properly rather than as a stopgap).

Outcome at end of week 1: no exposed secrets, no direct client→DB path, no
leaking internals. The app still looks and behaves the same to users.

## Month 1 — introduce the layers, one route at a time

- Stand up the `routes → controllers → models` structure shown in Task A's
  `/backend/src`, and migrate one route group at a time (leads, then auth),
  each behind its own PR and manually verified in staging before the old
  handler is deleted. Old and new code paths can coexist during the
  migration of a given route — there's no requirement to cut over everything
  at once.
- Add the permission checks that the direct-DB-access pattern made
  impossible: `requireAuth` / `requireRole`, and the "members only see their
  own or unassigned leads" scoping that's in `leadController.js`. This is a
  behavior change for end users (members will suddenly *not* see leads they
  could previously see via the exposed API key), so it ships with a short
  release note and a heads-up to whoever manages the sales team, not as a
  silent change.
- Start writing tests as each route is migrated, not as a separate project
  afterwards — a controller without a test doesn't count as migrated.

Outcome at end of month 1: the full request path (frontend → Express →
Mongoose) is layered and permission-checked for every route, matching Task A.

## Quarter 1 — close the gap and prevent regression

- Full test coverage for auth rules and the core lead lifecycle (this is
  what `tests/auth.test.js` and `tests/leads.test.js` are — the target
  state, not aspirational).
- CI gate: no merge to main without tests passing (see the standards
  proposal for the exact gate).
- Input validation on every write endpoint, consistent 4xx/5xx status codes
  throughout, matching the API contract documented in Task A's README.
- Retrospective checkpoint: confirm nothing in the old v0 code path is still
  reachable, then delete it. This step gets its own PR specifically so a
  reviewer can verify there's no dangling client using the old shape.

## Why this order

Each phase is chosen so that stopping partway through still leaves the app in
a strictly safer state than before — week 1 alone removes the two issues that
are actively exploitable today, even if nothing else ever happens after it.
