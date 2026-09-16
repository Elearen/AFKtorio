---
name: Recipe productivity
description: Simulation semantics for per-recipe productivity bonuses.
---

Productivity is stored per recipe as a decimal bonus and multiplies every output amount for that recipe. A recipe with 0.05 productivity produces 1.05 times its configured output per cycle.

**Why:** The chosen model represents actual machine behavior: a productive machine still consumes its configured inputs once per cycle, while producing bonus output. Peak supply must therefore increase with productivity, but peak demand must remain actual per-cycle input consumption.

**How to apply:** Keep recipe display/catalog amounts unchanged until the UI is intentionally updated. Route automated and handcraft output calculations, peak production, and output-based throttles through the productivity-adjusted outputs; leave recipe input consumption and peak demand on the base input amounts.