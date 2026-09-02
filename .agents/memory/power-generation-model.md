---
name: Power generation model
description: The current simulation contract for steam and solar power generation.
---

Boilers consume stored coal and water to produce virtual steam; steam engines consume that virtual steam and generate power. Solar Energy activates a fixed power source immediately with no material input or construction cost.

**Why:** The Power tab is intentionally production-oriented without adding steam as another stored inventory resource, while solar remains a simple research reward.

**How to apply:** Keep boiler output input-limited by coal and water, keep engine output limited by available boiler steam, and do not deduct plates, circuits, coal, or water for solar generation.