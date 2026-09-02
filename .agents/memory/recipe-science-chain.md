---
name: Recipe science-chain classification
description: Rule for identifying recipes that belong to the science-pack production chain.
---

Mark a recipe Core when it produces a science pack or recursively produces an ingredient or fuel required by any science-pack recipe; mark all other recipes Non-Core.

**Why:** This captures the complete production dependency graph rather than only labeling the six final science-pack recipes.

**How to apply:** Start from every science-pack output, walk backward through recipe producers, include all reachable recipes, and expose the resulting classification as part of each recipe record.