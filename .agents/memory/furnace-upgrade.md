---
name: Furnace conversion
description: Global Steel Furnace conversion behavior and construction distinction
---

The furnace upgrade path is factory-wide: the Steel Furnace and Electric Furnace conversions affect all constructed furnaces, while Electric Furnace module levels are cumulative global variants. Additional furnace construction follows the active base furnace recipe after conversion; module variants use the Electric Furnace recipe. Electric module power is 256/276/272 kW for levels 1/2/3, while electric smelting remains coal-free and at the Electric Furnace base speed.

**Why:** Existing production cards aggregate furnace counts by recipe, so a single saved variant keeps every smelting line consistent after one timed conversion without introducing per-card machine state.

**How to apply:** Keep furnace construction timing and ingredients recipe-derived, selecting Stone Furnace, Steel Furnace, or Electric Furnace as the base recipe. Keep the operational `furnaceVariant` synchronized with the generic `machineVariants.furnace` entry so ranked module upgrades, save migration, completion, power draw, fuel demand, icons, labels, and recipe effects all use the same global state.