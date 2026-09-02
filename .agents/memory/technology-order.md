---
name: Technology tier ordering
description: Canonical ordering rule for the technology screen and ordered auto research.
---

The technology screen and auto-research scheduler use the supplied tier list as a flattened canonical order. Normalized catalog aliases are mapped into that list, while catalog entries not present in the list remain available after the supplied order.

**Why:** The visible progression should follow the intended gameplay tiers instead of the source catalog’s prototype order.

**How to apply:** Reuse the canonical ordered catalog for rendering, initial selection, save normalization, and auto-research priority; do not sort these views independently.