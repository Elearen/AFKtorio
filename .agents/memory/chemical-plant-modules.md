---
name: Chemical Plant modules
description: The prerequisite and recipe scope for Chemical Plant module upgrades.
---

Chemical Plant module upgrades require the existing `oil-processing` unlock plus the productivity, speed, and efficiency technology for their tier. The installed Chemical Plant variant is tracked separately from the construction recipe and applies globally to every recipe in the canonical chemical-plant recipe set.

**Why:** `oil-processing` is the technology that unlocks the Chemical Plant construction recipe; chemical recipes are otherwise easy to accidentally include in generic assembly-machine logic.

**How to apply:** Keep Chemical Plant module costs and completion keyed to the chemical machine count and variant, and derive affected recipes from the shared chemical recipe list rather than duplicating or broadening the scope.