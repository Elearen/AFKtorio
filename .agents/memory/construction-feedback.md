---
name: Construction feedback
description: Durable UI pattern for showing building actions and timed progress.
---

Use the shared construction queue as the single source of truth for pressed/queued states and progress indicators.

**Why:** A second client-side timer can drift from the simulation and make a building appear complete before it is actually active.

**How to apply:** Derive button state, queued counts, remaining time, and percentage completion directly from the queue item that the simulation decrements.

Construction warnings should report only the remaining deficit for each unavailable material, not the full cost of another building or materials already in inventory.

**Why:** Full-cost warnings obscure the actionable blocker when the player already owns some of the required materials.

**How to apply:** Compare live raw/product inventory against each construction cost, filter to positive deficits, and keep non-construction warnings unchanged.

Newly funded construction must not consume build time in the same simulation tick that its final material is reserved; its full timer starts on the following tick.

**Why:** A one-second storage build could otherwise be marked complete immediately when the last missing material arrived, making capacity increase before the request visibly finished.

**How to apply:** Track which queue items were already active at simulation start, decrement only those items during the current tick, and apply completion effects only to them.