---
name: Power generation model
description: The current simulation contract for steam and solar power generation.
---

Boilers consume coal and water for virtual steam at the smaller of their two available input ratios; steam engines consume that virtual steam and scale power output to the steam available. Boilers claim coal before burner miners and furnaces, while electrically powered labs and assemblers scale their production by the network's available-power ratio. Solar Energy activates a fixed power source immediately with no material input or construction cost.

**Why:** A producer must not report steam or power that its limiting reagent cannot support; downstream machines should visibly degrade when the steam line is undersupplied.

**How to apply:** Calculate one shared boiler coal/water ratio, deduct only the funded inputs, derive steam from that ratio, then apply min(1, available steam / engine demand) to engine power. Use live-versus-peak producer metrics. Deduct boiler coal before other coal uses. Apply min(1, generated power / required power) to labs and electric assemblers. Do not deduct plates, circuits, coal, or water for solar generation.