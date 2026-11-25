# PathProof — context for Kane

PathProof turns a life goal into a map of milestones and uses A* search to pick the cheapest route.

- The main page is `/` (the app). Top bar: a goal picker ("Select Goal…"), a "+ Milestone" button.
- "+ New" in the goal picker opens the **New goal** dialog. Fields: goal, context, constraints, timeframe, budget, a detail choice and a routes choice. The submit button makes the map.
- With no API keys the app uses the **offline** dreamer, so maps still appear (slower LLM output is not expected).
- The left panel shows the goal title, the route as an ordered list (`#pathList`) and the total cost (`#pathTotal`).
- The canvas (`#canvas`) shows milestones as nodes joined by edges. Clicking a node opens its inspector, where it can be blocked or have friction added.
- Blocking a node on the current route must make A* pick a route that avoids it, or say no route exists.
- A first-time tour may pop up; close or skip it.

## Reading the left panel correctly
From top to bottom the left panel shows: the goal title, a progress bar, Detail / Paths selects, a **Path profile** bar chart (numbered bars), a **Timeline** bar (numbered segments), and then the **Best Path** heading.
- The route is ONLY the numbered list directly under **Best Path**. Each item has a number, a step title, a "→ next milestone" line and cost chips.
- The chart bars and timeline segments are NOT route steps. Never count them as the route.
- If nothing is listed under Best Path, the route list is empty.
