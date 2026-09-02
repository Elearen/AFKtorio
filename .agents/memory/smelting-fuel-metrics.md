---
name: Smelting fuel metrics
description: Convention for displaying furnace coal usage on production cards.
---

Show furnace fuel as normalized coal per output item, recent actual coal consumption per minute, and theoretical peak coal consumption per minute from the current furnace count.

**Why:** A smelting recipe can produce more than one output per cycle, and players need both observed usage and capacity potential.

**How to apply:** Divide cycle fuel by cycle output for the per-item cost; derive current usage from recent recipe output and peak usage from cycle capacity.