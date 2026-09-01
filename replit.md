# Factory Production Game

A mobile-first incremental factory simulator where players grow a self-funded production network from raw materials into advanced technology.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/factory-production-game/src/App.tsx` — playable factory simulation and production-floor UI
- `artifacts/factory-production-game/src/recipeCatalog.ts` — normalized catalog of 192 recipes from the attached Lua definitions
- `artifacts/factory-production-game/src/technologyCatalog.ts` — normalized catalog of 196 technologies from `wube/factorio-data/base/prototypes/technology.lua`
- `artifacts/factory-production-game/src/index.css` — industrial control-room theme and responsive layout
- `attached_assets/Pasted-Factory-Production-Game-Technical-Specification-1-Game-_1788259810206.txt` — product specification

## Architecture decisions

- The playable slice is frontend-only and persists game state in localStorage so the core idle loop works without a server account.
- The ten control tabs share one client simulation state so manual actions, construction, production, power, storage, upgrades, science, research, and offline catch-up stay consistent.
- Recipe simulation uses the attached catalog's generic item/fluid inputs and multi-output results; legacy starter resources remain connected through explicit source-name aliases.
- Research uses the official Factorio technology identifiers as stable dependency keys, with the source helper for follower-robot upgrades expanded into four concrete entries. Legacy custom research identifiers are migrated when local saves load.
- Resource visuals are original inline illustrations; Factorio is used as a mechanical vocabulary reference, not as a source for copied artwork or interface assets.

## Product

- The factory tab shows factory-wide throughput, active units, total output, power balance, queues, bottleneck recommendations, and network signals.
- Mining, production, power, storage, logistics, upgrades, science, research, and settings each have dedicated tabs with their own controls and progression states.
- Production exposes the full catalog with search and category filters, including hidden, disabled, fluid, probabilistic, and multi-output definitions.
- The research tab shows all 196 dependency-aware technologies, search, prerequisites, research triggers, per-node science-pack costs, unit data, upgrade metadata, effects, and unlock actions with original illustrations.
- Production continues while the player is away and reports the recovered offline interval on return.

## User preferences

- Use vanilla Factorio as inspiration for resource vocabulary, recipe logic, and production progression while keeping visuals original.

## Gotchas

- The web artifact workflow supplies `PORT` and `BASE_PATH`; use the managed workflow for previews and restarts.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
