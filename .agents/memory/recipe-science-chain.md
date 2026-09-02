---
name: Recipe science-chain classification
description: Rule for identifying recipes that belong to the science-pack production chain.
---

Mark a recipe Core when it produces a science pack or recursively produces an ingredient or fuel required by any science-pack recipe; mark all other recipes Non-Core.

**Why:** This captures the complete production dependency graph rather than only labeling the six final science-pack recipes.

**How to apply:** Start from every science-pack output, walk backward through recipe producers, include all reachable recipes, and expose the resulting classification as part of each recipe record.

Storage items inherit Core status when they appear as an ingredient, fuel, or output of any Core recipe; all other tracked items are Non-Core.

**Why:** Storage contains both raw materials and recipe products, so item filtering needs to include the inputs that feed the science chain as well as its outputs.

**How to apply:** Reuse the recipe-derived item set for storage filters, with Core selected by default; keep All and Non-Core available.