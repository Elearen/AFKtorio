---
name: Storage chest tiers
description: Product decision for upgrading item-storage containers without changing fluid storage.
---

Item-storage containers use one global chest tier: all constructed wooden chests convert to iron chests together, and future item boxes use the iron-chest capacity and recipe. Fluid storage is tank-based and remains independent.

**Why:** The upgrade is defined as a factory-wide conversion of wooden chests, while fluid storage has a separate tank system that must not inherit item-container changes.

**How to apply:** Keep chest capacity, construction icon, and construction cost derived from the global chest tier. Exclude fluid keys from chest counts and capacity changes.