# PathProof: notes for Claude Code

## Kane CLI verifies your work

This project uses **Kane CLI** (an AI browser-testing agent) to check every change in a real Chrome window.

- The checks are plain-English objectives in `kane/checks.json`.
- `.claude/settings.json` has a **Stop hook**: when you finish, it runs `node scripts/verify.js --hook`, which runs each check with `kane-cli run --agent` against the app at http://localhost:8000.
- If a check fails, the hook blocks you from stopping and sends you Kane's report ("Kane saw: …"). **That report describes a real problem in the running app.** Find the cause in the code and fix it, even if it is unrelated to the change you were asked to make. Do not edit the checks to make them pass.
- After fixing, finish again; the hook re-runs Kane. You are done when Kane passes.
- The full report is in `kane/last-report.md`; Kane's raw output for each check is in `kane/runs/<check>.ndjson`.
- You can also run the checks yourself: `npm run verify` (all) or `node scripts/verify.js new-goal` (one).

The hook skips Kane when the app is not running, when kane-cli is not logged in, or when nothing in `public/`, `lib/` or `server.js` changed since the last pass.

## The app

- `server.js`: Express server and API. `npm start` serves on port 8000.
- `public/index.html` + `public/js/app.js`: the planner (goal map, A* route, left panel with `#pathList`).
- `public/js/astar.js`: the A* search.
- `public/home.html`: the landing page.
- Never commit `.env` or `.env.local`.
