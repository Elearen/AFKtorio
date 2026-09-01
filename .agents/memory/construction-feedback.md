---
name: Construction feedback
description: Durable UI pattern for showing building actions and timed progress.
---

Use the shared construction queue as the single source of truth for pressed/queued states and progress indicators.

**Why:** A second client-side timer can drift from the simulation and make a building appear complete before it is actually active.

**How to apply:** Derive button state, queued counts, remaining time, and percentage completion directly from the queue item that the simulation decrements.