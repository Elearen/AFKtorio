---
name: Navigation scroll behavior
description: Shared tab navigation and scroll interaction conventions.
---

The app uses a fixed two-row mobile tab rail and a dedicated main scroll pane; each tab restores its own scroll position, while activating the already-selected tab scrolls that pane to the top.

**Why:** The ten-tab control surface must remain reachable on small screens without losing users' place when they switch between long pages.

**How to apply:** Keep mobile navigation at five columns by two rows, save scroll offsets by route, and intercept repeated active-tab clicks for a top reset.

Focus links use the router's search subscription for query targets; pathname-only routing will not react to same-tab focus changes, and scrolling must target the dedicated main pane rather than window.

**Why:** The mobile recipe jump was confirmed working only after separating pathname and search state and scrolling the element that owns the app's overflow.

**How to apply:** Read focus parameters with the router search hook, then update the main pane after the destination card mounts.