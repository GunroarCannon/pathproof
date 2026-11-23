# PathProof

An A* map for your goals. Every change the coding agent makes is checked in a real browser by **Kane CLI**, and the agent is not allowed to call the work done until Kane passes.

Built for the KaneCLI Online Hackathon (TestMu AI, 12–26 Nov 2026).

> Work in progress.

## Run it

```bash
npm install
cp .env.example .env   # fill in keys (all optional; the app has offline fallbacks)
npm start              # http://localhost:8000
```

## Lineage

PathProof is a new repository started during the hackathon. It reuses the pathfinding map, rendering and UI from my earlier project GoalStar. Blockchain certificates were removed, and the Kane verification loop was added.
