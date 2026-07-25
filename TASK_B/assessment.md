# Task B — Assessment

**Scenario as given:** I'm handed a working-but-poorly-built codebase — no
tests, business logic inside route handlers, direct database calls from the
frontend, secrets in the repo — serving real customers, that cannot go down.

**How I'm using Task A here:** rather than invent an unrelated toy example, I
treated LeadFlow itself as the subject — specifically, the rushed "v0" shape
the app would plausibly have taken if it had been built as a two-day MVP
before anyone circled back to harden it. `refactor_before.js` is that v0: one
file, no layers, no tests. The actual LeadFlow code in `/backend` and
`/frontend` (Task A) is the "after." This lets the refactor demo in this task
be a real, working diff instead of a contrived snippet.

## What's wrong, in the order I'd fix it

| # | Issue | Why it's this priority | Risk of leaving it |
|---|---|---|---|
| 1 | **Secrets committed to the repo** (DB connection string, JWT signing key hardcoded in source) | Fix first — it's the only issue that's actively dangerous the moment the repo is cloned by anyone, including a future contractor or a leaked repo | Full database compromise; anyone with repo access (or a repo leak) can forge auth tokens for any user, including admin |
| 2 | **Frontend talks to the database directly** (an API key embedded in client-side JS is used to query Mongo's Data API straight from the browser) | Fix second — this is the same class of problem as #1 (a client-exposed credential) but also removes any possibility of server-side validation or permission checks on writes | Any user of the site can read or write any lead, any user's data, from browser dev tools — there is no real access control, only what happens to be hidden in the UI |
| 3 | **Business logic embedded in route handlers, no service/model layer** | Fix third — this doesn't leak data on its own, but it's the reason #1 and #2 were possible: there's no natural seam where validation and auth checks are supposed to live | Every new feature has a decent chance of reintroducing #1 or #2-shaped bugs, because there's no structural pattern stopping it |
| 4 | **No automated tests** | Fix fourth, in parallel with the refactor above, not before it | Every fix to 1–3 is a guess about correctness; regressions in lead visibility (a member seeing another member's leads) would ship silently |
| 5 | **No input validation / inconsistent error handling** | Lower priority than the above, but compounds them | Bad data reaches the database (e.g. malformed email), and errors leak stack traces or Mongo error internals to the client |

I ordered this by *exposure*, not by effort. Rotating a secret is a 10-minute
fix with the biggest risk reduction in the list; a full layered rewrite is
the most effort and the smallest immediate risk reduction, which is exactly
why it's fourth, not first.

## What I'd leave alone for now

The v0's data model (leads with embedded notes) isn't actually wrong at this
scale — it doesn't need to change as part of this cleanup. Refactoring
architecture and refactoring the data model are two different projects, and
mixing them multiplies the risk of the change for no corresponding benefit
right now.
