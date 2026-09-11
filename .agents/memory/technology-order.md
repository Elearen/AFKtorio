---
name: Technology tier ordering
description: Canonical ordering rule for the technology screen and ordered auto research.
---

The technology screen and Auto-research fallback use the latest supplied tier list as a flattened canonical order. User-selected research is an append-ordered queue and takes priority over that fallback. Normalized catalog aliases are mapped into the tier list, while catalog entries not present in the list remain available after the supplied order.

**Why:** The visible progression should follow the intended gameplay tiers instead of the source catalog’s prototype order, while explicit player taps must control research priority.

**How to apply:** Reuse the canonical ordered catalog for rendering, save normalization, and the default Auto-research choice; preserve the saved user queue order and never sort it by catalog position.

The technology screen defaults to showing prerequisite-unlocked, incomplete technologies; completed and prerequisite-locked entries are available through explicit filters.

**Why:** The default view should focus the player on the next actionable research choices without hiding the full catalog.

**How to apply:** Keep search scoped within the selected status filter and preserve the three filter states: completed, unlocked, and locked.