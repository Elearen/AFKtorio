---
name: Navigation scroll behavior
description: Shared tab navigation and scroll interaction conventions.
---

The app uses a fixed two-row mobile tab rail and a dedicated main scroll pane; each tab restores its own scroll position, while activating the already-selected tab scrolls that pane to the top.

**Why:** The ten-tab control surface must remain reachable on small screens without losing users' place when they switch between long pages.

**How to apply:** Keep mobile navigation at five columns by two rows, save scroll offsets by route, and intercept repeated active-tab clicks for a top reset.