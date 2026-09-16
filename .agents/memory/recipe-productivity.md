---
name: Recipe productivity
description: Simulation semantics for per-recipe productivity bonuses.
---

Productivity is stored per recipe as a decimal bonus and multiplies every automated output amount for that recipe. A recipe with 0.05 productivity produces 1.05 times its configured output per automated cycle.

**Why:** The chosen model represents actual machine behavior: a productive machine still consumes its configured inputs once per cycle, while producing bonus output; handcrafting always follows the base recipe. Peak supply must therefore increase with automated productivity, but peak demand must remain actual per-cycle input consumption.

**How to apply:** Keep recipe display/catalog amounts unchanged until the UI is intentionally updated. Route automated output calculations, peak production, and output-based throttles through productivity-adjusted outputs. Keep handcraft output and handcraft peak output on base recipe amounts; leave recipe input consumption and peak demand on the base input amounts.