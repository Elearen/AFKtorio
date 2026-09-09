---
name: Coal mining exception
description: Special fuel behavior for automated coal extraction.
---

Coal miners are self-fueled: they never consume stored coal or enter the shared burner-fuel throttle, and their net output is mining yield minus drill fuel usage. Other burner-miner fuel is a binary gate: active demand lines run at full rate while any coal remains at the start of the tick, and stop only when that shared coal pool is empty; full no-demand lines do not consume it.

**Why:** Coal must remain available as the bootstrap fuel source even when the current coal inventory is empty. Boiler-first allocation can make a visibly stocked coal buffer appear empty to burner miners, while proportional throttling with nonzero coal double-counts fuel scarcity because operating time already limits fuel use.

**How to apply:** Exclude coal miners from fuel-demand accounting and subtract their per-drill fuel rate directly from coal mining output; let iron, copper, and stone burner miners consume their start-of-tick coal allocation before boilers; exclude full no-demand burner lines from shared fuel counts; let operating time handle partial fuel exhaustion.