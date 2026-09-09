---
name: Power generation model
description: The current simulation contract for steam and solar power generation.
---

Boilers consume coal and water for virtual steam at the smaller of their two available input ratios; steam engines consume that virtual steam and scale power output to the steam available. Burner miners consume their coal allocation before boilers, so a nonzero coal buffer keeps iron/copper/stone mining running until the buffer is exhausted; electrically powered labs and assemblers scale their production by the network's available-power ratio. Solar panels and accumulators are separately constructed power-network units; crafted items with those names remain independent inventory.

**Why:** A producer must not report steam or power that its limiting reagent cannot support; downstream machines should visibly degrade when the steam line is undersupplied.

**How to apply:** Let active burner miners reserve operating time from the coal available at the start of the tick, deduct their actual fuel use, then calculate one shared boiler coal/water ratio from the remaining funded inputs and derive steam. Apply min(1, available steam / engine demand) to engine power and min(1, generated power / required power) to labs and electric assemblers. Use live-versus-peak producer metrics. Direct solar and accumulator construction reserves its catalog recipe inputs, while solar generation itself consumes no operating fuel.