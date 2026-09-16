---
name: Factory game build verification
description: Environment requirement for validating the factory-production-game artifact build.
---

The factory-production-game Vite build requires both `PORT` and `BASE_PATH` to be set; the artifact configuration uses `/` as the base path.

**Why:** Running the package build without these variables fails while loading Vite config before any source code is compiled.

**How to apply:** Set `PORT` to the workflow port and `BASE_PATH=/` for local production-build verification.