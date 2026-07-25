# LeadFlow — Lead Management Platform

A small full-stack app a real sales team could run on day one: a public capture
form feeding an authenticated pipeline tool with role-based permissions.

Built for the Digital Heroes Full Stack Development qualification task (Task A).

**Stack:** React (Vite) · Express · MongoDB (Mongoose) · JWT auth
**Live URL:** _add after deploying — see Deployment below_
**Repo:** _add your GitHub URL here_

---

## Why this stack, and a few decisions worth explaining

I went with a plain MERN-style split (React SPA talking to an Express JSON API)
rather than a framework like Next.js, because the brief explicitly asks for a
JSON API with pagination/filtering and documented status codes — that's cleaner
to reason about and test as a standalone service than mixed into a
server-rendering framework, and it means the frontend and backend can be
deployed, scaled, and tested independently.

A few things I deliberately did *not* do, on purpose:

- **No open self-registration.** New accounts are created by an admin
  (`POST /api/auth/users`). A lead-management tool with two roles doesn't need
  a public signup flow, and adding one just widens the attack surface for no
  real benefit.
- **Members don't see everyone's leads.** A member can only see/act on leads
  that are unassigned or assigned to them (enforced server-side in
  `leadController.js`, not just hidden in the UI). This is the one piece of
  business logic in the brief that isn't spelled out explicitly, so I made an
  assumption: a small sales team wants reps focused on their own queue, and
  admins need the full picture. Stated here as required by the brief's
  "assumptions are part of the test" rule.
- **The public form can only ever create a `new` lead.** Status, assignment,
  and notes are rejected/ignored on that endpoint even if someone tries to
  smuggle them into the request body — see the test
  `public endpoint cannot set status, assignment, or notes directly`.

## Architecture

```
frontend (React/Vite SPA)
  PublicCaptureForm  ── POST /api/public/leads (no auth)
  Login              ── POST /api/auth/login
  Dashboard          ── GET  /api/leads (paginated, filterable)
  LeadDetail         ── GET/PATCH /api/leads/:id, notes, assignment

backend (Express)
  routes/  -> controllers/  -> models/ (Mongoose)
  middleware/auth.js: requireAuth (verifies JWT) + requireRole('admin'|'member')
  middleware/errorHandler.js: single place that turns thrown errors into
    the right HTTP status (Mongoose ValidationError -> 400, CastError -> 400,
    duplicate key -> 409, everything else -> 500)
```

Data model: a `Lead` document embeds its own `notes[]` and `activity[]`
sub-documents rather than living in separate collections. At this scale
(a handful of notes/events per lead) that's simpler and avoids join-like
queries on every page load; it would need to change if notes/activity grew
into something queried independently at volume (see Task B's migration plan
for how I'd think about that kind of change later).

## API contract

Base URL: `/api`. All authenticated routes expect `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/public/leads` | none | Create a lead from the public form. Body: `{name, email, phone?, company?, message?}`. `201` on success. |
| POST | `/auth/login` | none | `{email, password}` → `{token, user}`. `401` on bad credentials. |
| GET | `/auth/me` | any | Current user. |
| GET | `/auth/users` | admin | List users (for the assign dropdown). |
| POST | `/auth/users` | admin | Create a user. `{name, email, password, role?}`. `403` for non-admins. |
| GET | `/leads` | any | Paginated list. Query: `page`, `limit` (max 100), `status`, `assignedTo` (`unassigned` or a user id), `q` (text search on name/email/company). Members are scoped to their own + unassigned leads. |
| GET | `/leads/:id` | any | Single lead with populated notes/activity. `403` if a member requests a lead assigned to someone else. |
| PATCH | `/leads/:id/status` | any | `{status}`, one of `new/contacted/qualified/converted/lost`. `403` if a member tries to modify a lead assigned to someone else. |
| PATCH | `/leads/:id/assign` | admin | `{userId}` (or `null`/omitted to unassign). |
| POST | `/leads/:id/notes` | any | `{text}`. Appends a timestamped note + activity entry. |
| DELETE | `/leads/:id` | admin | `204` on success. |

Standard status codes throughout: `400` validation, `401` missing/invalid
token, `403` authenticated but not permitted, `404` not found, `409` duplicate
key (e.g. email already registered), `500` unexpected.

## Running locally

```bash
# Backend
cd backend
cp .env.example .env        # fill in a real MONGO_URI + JWT_SECRET
npm install
npm run seed                 # creates an admin + member + 2 sample leads
npm run dev                  # http://localhost:4000

# Frontend
cd frontend
cp .env.example .env         # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                  # http://localhost:5173
```

Seeded logins (printed by `npm run seed`, override in `.env`):
- `admin@leadflow.dev` / `ChangeMe123!`
- `member@leadflow.dev` / `ChangeMe123!`

## Tests

```bash
cd backend
npm test
```

`tests/auth.test.js` covers the auth rules: no token → 401, invalid token →
401, wrong password → 401, member blocked from admin-only actions (403) with
admin allowed (200/204/201) for the same actions. `tests/leads.test.js` covers
the two core flows end to end: (1) a public submission landing as a visible
`new` lead for admins, with the public endpoint unable to set privileged
fields, and (2) a member being assigned a lead, updating its status, adding a
note, and all three showing up in the activity trail — plus a member being
blocked from a lead assigned to someone else, and pagination/filtering.

**Note on this environment:** this repo was written in a sandbox without
network access, so I could not run `npm install` / `npm test` here — every
file was checked with `node --check` for syntax validity, and the test logic
was written and reviewed carefully, but you should run `npm test` yourself
after installing dependencies before treating it as green. Flagging this
directly rather than implying it's been verified when it hasn't.

## Deployment

- **API:** Render/Railway — set `MONGO_URI` (e.g. MongoDB Atlas free tier),
  `JWT_SECRET`, `CORS_ORIGIN` (your frontend's deployed URL) as environment
  variables, build command `npm install`, start command `npm start`.
- **Frontend:** Vercel/Netlify — set `VITE_API_URL` to your deployed API's
  `/api` base, build command `npm run build`, output `dist`.
- After both are live, run the seed script once (locally, pointed at the
  production `MONGO_URI`) so there's a working admin login to demo with.

## What I'd add next given more time

- Password reset flow (currently admin-issued only, no self-service recovery)
- Optimistic UI updates on the dashboard instead of a full refetch per action
- Server-side rate limiting on the public capture endpoint
