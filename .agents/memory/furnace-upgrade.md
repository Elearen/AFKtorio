---
name: Furnace conversion
description: Global Steel Furnace conversion behavior and construction distinction
---

The Steel Furnace upgrade is a factory-wide conversion of all constructed stone furnaces. Its cost and duration come from the Steel Furnace recipe, and additional furnace construction follows the active variant recipe after conversion. The converted operating variant doubles smelting speed and halves coal per item.

**Why:** Existing production cards aggregate furnace counts by recipe, so a single saved variant keeps every smelting line consistent after one timed conversion without introducing per-card machine state.

**How to apply:** Keep furnace construction timing and ingredients recipe-derived, selecting Stone Furnace before conversion and Steel Furnace after it. Apply the global furnace variant to smelting rate, fuel demand, icons, labels, and upgrade completion.