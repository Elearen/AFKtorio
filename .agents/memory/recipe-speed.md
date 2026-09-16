---
name: Recipe speed
description: Simulation semantics for per-recipe speed bonuses.
---

Recipe speed is stored per recipe as a decimal bonus. A 0.05 bonus uses a 1.05 cycle-rate multiplier, so effective recipe seconds are divided by 1.05 and automated ingredient throughput rises by 5%.

**Why:** The requested peak supply and demand behavior is an exact additive percentage increase for the same machine count, while the example's rounded time reduction is best represented by the conventional speed multiplier.

**How to apply:** Keep all recipe speed values at 0% until a future mechanic grants them. Apply speed to automated cycle timing, peak supply, and recipe ingredient demand. Reduce per-cycle furnace fuel input by the same multiplier so total fuel usage remains unchanged; keep machine power draw tied to machine count. Handcraft uses the effective recipe time, but handcraft remains on base recipe outputs.