---
name: Mining module variant
description: The installed mining modules upgrade is represented through the mining machine variant rather than a separate completion flag.
---

The mining modules upgrade uses a distinct mining machine variant as its installed state. Operational code must treat that variant as electric for power, power throttling, construction, icons, and coal behavior.

**Why:** The project intentionally keeps upgrade completion in the existing machine-variant state model instead of adding a separate persisted completion flag.

**How to apply:** When adding mining upgrades or reading the mining variant, preserve the module variant through save migration and include it in every electric-miner branch.