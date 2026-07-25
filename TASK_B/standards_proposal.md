# Task B — Engineering Standards Proposal

## The standards

1. **No secrets in source, ever.** Enforced by a pre-commit hook
   (`git-secrets` or `gitleaks`) that blocks a commit containing anything
   that looks like a connection string, API key, or private key pattern —
   not a style guideline, a thing that physically stops the commit.
2. **No route handler talks to the database directly.** Routes call
   controllers; controllers call models. This is checked in code review, not
   automated — it's a structural convention, not a lintable rule, so it
   needs a human to catch a controller that's grown a raw query in it.
3. **Every endpoint that mutates data requires an explicit permission
   check**, even if today every role happens to be allowed to do it. The
   default is "denied unless a `requireAuth`/`requireRole` is visibly
   present on the route," not "allowed unless someone remembers to add a
   check."
4. **No PR merges without a passing test for the behavior it changes.** Not
   100% coverage as a vanity number — specifically, a PR that changes what a
   user is allowed to see or do needs a test that would fail without the
   change.
5. **Consistent error shape everywhere:** `{ error: string }` with the
   correct status code, via the shared error handler — no route hand-rolls
   its own error response format.

## CI gate (concrete, not aspirational)

A GitHub Actions workflow on every PR: `npm ci`, `npm test`
(`mongodb-memory-server` means this needs no external database), plus the
secrets pre-commit hook re-run in CI as a second line of defense in case
someone bypassed it locally. Merge is blocked on any of these failing.

## Getting a resistant team to actually adopt this

Teams don't resist standards because they disagree with them in the
abstract — they resist them when the standards show up as a lecture, apply
unevenly, or make everyday work slower with no visible payoff. So:

- **Introduce them attached to a real incident, not a memo.** This
  proposal exists because of a specific, concrete finding (the leaked
  credential and the open delete endpoint) — lead with that story, not
  with a policy document, when this is actually presented to a team.
- **Make the easy path the compliant path.** A PR template with the
  checklist already in it, a `requireAuth` that's one import away, a test
  helper (`createUser('admin')`, already in this repo's `tests/auth.test.js`)
  that makes writing the required test the fast option, not the annoying
  extra step.
- **Apply the gate to new code first, not retroactively to everything at
  once.** Nobody adopts a standard that's presented as "and also now 40
  existing files are failing CI." The migration plan's phased approach
  (Week 1 / Month 1 / Quarter 1) exists partly for this reason — the team
  should never feel like the standard is punishing code they didn't write.
- **Have the standard apply to whoever proposes it too, visibly.** If this
  PR is the one that adds the CI gate, it should also be the PR with the
  most thorough tests in the repo, not the one that gets a quiet exception
  because it's infrastructure.
