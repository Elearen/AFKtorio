---
name: Recipe science-chain classification
description: Rule for identifying recipes that belong to the science-pack production chain.
---

Mark a recipe Core when it produces a science pack or recursively produces an ingredient or fuel required by any science-pack recipe; mark all other recipes Non-Core. Radar, Solar Panel, and Accumulator are deliberately deferred as Non-Core until Space Science is unlocked, then join the Core chain.

**Why:** This captures the complete production dependency graph rather than only labeling the final science-pack recipes, while keeping late-game support recipes out of the starting Core view until their endgame unlock.

**How to apply:** Start from every science-pack output, walk backward through recipe producers, include all reachable recipes, and expose the resulting classification as part of each recipe record. Apply the Space Science unlock override consistently in Production and Storage.

Storage items inherit Core status when they appear as an ingredient, fuel, or output of any Core recipe; all other tracked items are Non-Core.

**Why:** Storage contains both raw materials and recipe products, so item filtering needs to include the inputs that feed the science chain as well as its outputs.

**How to apply:** Reuse the recipe-derived item set for storage filters, with Core selected by default; keep All and Non-Core available.