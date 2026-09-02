---
name: Coal mining exception
description: Special fuel behavior for automated coal extraction.
---

Coal miners are self-fueled: they never consume stored coal or enter the shared burner-fuel throttle, and their net output is mining yield minus drill fuel usage.

**Why:** Coal must remain available as the bootstrap fuel source even when the current coal inventory is empty.

**How to apply:** Exclude coal miners from fuel-demand accounting and subtract their per-drill fuel rate directly from coal mining output; keep other burner minerals unchanged.