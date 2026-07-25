# Before you submit — read this

This kit explicitly penalizes work that "could have come from anyone," and
says they check. Treat everything in this repo as a strong first draft, not
a finished submission. At minimum, before sending:

1. **Run it for real.** This was written in a sandbox with no network
   access, so `npm install` / `npm test` / actually running the app have not
   been executed here — only checked for syntax validity. Install deps, run
   `npm test` in `/backend`, fix anything that comes up, run both apps
   locally, and deploy them (Render/Railway + Vercel/Netlify, or your usual
   stack) before this counts as done.
2. **Put your own judgment into at least one real decision.** A good
   candidate: the member-visibility rule ("members only see unassigned or
   their own leads") is my assumption, stated as one in the README. Decide
   for yourself if you'd rather have members see everything read-only, or
   something else, and change it — then you can talk about *why* in the
   interview, which is the actual point of the exercise.
3. **Adjust the visual design, copy, and README voice** so it reads like
   you, not like a template. The color palette, the wording in the public
   form, the README's tone — all easy, meaningful places to make it yours.
4. **Fill in the live URL and GitHub link** in `README.md` once deployed.

## AI usage paragraph (draft — edit this into your own words)

> I used Claude to scaffold the initial Express/MongoDB API, the React
> frontend, and the test suite for Task A, and to structure the assessment,
> migration plan, and refactor write-up for Task B. I reviewed the
> permission-scoping logic (which leads a member can see) and decided to
> [keep it / change it to ___] because [your reasoning]. I rewrote
> [the README's tone / the public form copy / the migration plan's
> reasoning about X] in my own words, and [describe anything else you
> changed, cut, or disagreed with]. I ran the test suite myself and
> [it passed as-is / I had to fix ___].

Replace the bracketed parts honestly — this paragraph is more convincing
with one real, specific thing you changed than with generic praise.
