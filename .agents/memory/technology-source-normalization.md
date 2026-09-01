---
name: Technology source normalization
description: Rules for importing the official Factorio technology prototype source into the playable research catalog.
---

Treat technology prototype imports as structured source data, not line-based text. The source mixes literal prototypes with helper-generated technologies, arithmetic unit counts, and boolean or hidden effect metadata.

**Why:** A line-based parser can silently omit the prototype following a function block, undercount arithmetic science requirements, or turn boolean effect modifiers into invalid numeric placeholders.

**How to apply:** Balance each prototype object, expand helper calls into concrete entries, evaluate numeric expressions safely, preserve boolean and hidden effect fields, and validate unique names plus prerequisite references before shipping.