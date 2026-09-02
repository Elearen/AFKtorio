---
name: Power generation model
description: The current simulation contract for steam and solar power generation.
---

Boilers, steam engines, and other power producers run at their rated output. Boilers claim coal before burner miners and furnaces, while electrically powered labs and assemblers scale their production by the network's available-power ratio. Solar Energy activates a fixed power source immediately with no material input or construction cost.

**Why:** Power availability should not fluctuate with consumer usage or starve the power line; only factory output should degrade during an underpowered state.

**How to apply:** Deduct boiler coal before all other coal uses, keep producer metrics at maximum, and apply min(1, generated power / required power) to labs and electric assemblers. Do not deduct plates, circuits, coal, or water for solar generation.