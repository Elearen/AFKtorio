---
name: Science throughput
description: Shared rules for active research, lab consumption, and science-pack production bottlenecks.
---

The active research selection is shared between the Research and Science tabs. Labs consume one unit of every science pack required by that active technology per completed lab cycle.

**Why:** Science demand depends on the selected technology, not merely on whether any science inventory exists; consuming the first available pack produces incorrect research behavior.

**How to apply:** Treat SPM as lab cycles per minute. Current SPM comes from recent actual lab consumption, while peak SPM is limited by lab capacity and the lowest available production rate among all required pack types.