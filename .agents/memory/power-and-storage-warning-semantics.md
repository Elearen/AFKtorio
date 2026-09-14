---
name: Power and storage warning semantics
description: UI rules for steam capacity badges and storage-capacity warnings.
---

Steam badges on the coal-power cards compare potential boiler steam output with potential steam-engine steam capacity. They do not report a temporary shortage caused by current coal or water inventory. Actual input shortages remain visible on the relevant coal or water badge, with water identifying a water-limited boiler line when current water cannot fund the full demand. Storage-capacity warning values use red text; the associated fill bar may remain amber.

**Why:** A water shortage should identify water as the limiting input instead of misleadingly marking the steam line as structurally undersized. Red storage text distinguishes a capacity warning from the normal amber progress treatment.

**How to apply:** Keep actual steam production and engine utilisation derived from the funded coal/water ratio. Use peak boiler and engine rates for steam-capacity status, and actual per-input ratios plus existing source-flow checks for coal/water status.