---
name: Science throughput
description: Shared rules for active research, lab consumption, and science-pack production bottlenecks.
---

The active research selection is shared between the Research and Science tabs. Labs consume one unit of every science pack required by that active technology per completed lab cycle.

**Why:** Science demand depends on the selected technology, not merely on whether any science inventory exists; consuming the first available pack produces incorrect research behavior.

**How to apply:** Treat SPM as lab cycles per minute. Current SPM comes from recent actual lab consumption, while peak SPM is limited by lab capacity and the lowest available production rate among all required pack types.

Auto research is an ordered selection, not a parallel scheduler: the first checked incomplete technology in catalog order owns the labs, and later checked technologies wait until it completes.

The Science tab's lab card reports aggregate current and peak science-pack usage alongside lab cycle capacity and shared construction-queue progress for new labs.

**Why:** Lab construction and input demand are the two constraints players need to see together when expanding research capacity.

**How to apply:** Keep the lab card aligned with Production cards: show the lab count/status, construction inputs, usage metrics, queue progress, and inline inspect/build controls.

**Why:** The game needs deterministic one-at-a-time progression while still allowing players to plan a research path ahead of available prerequisites.

**How to apply:** Keep auto selections normalized to catalog order and block later entries when the first pending selection is not yet available.

The Research screen’s live summary uses lab units per minute for the active lab-driven technology and estimates completion from remaining units; production-trigger technologies show a waiting state instead.

**Why:** Trigger-based unlocks do not advance through labs, so presenting a lab rate or numeric ETA for them would be misleading.

**How to apply:** Keep trigger progress visible on the technology card, but use a waiting label rather than inventing a research rate or completion time.

Research completions are persisted as an ordered acknowledgement queue rendered by the top-level game shell, so completion summaries cannot be missed when the player is viewing another tab.

**Why:** Research advances in the background and can complete while the user is away from the Technology screen.

**How to apply:** Queue both lab-driven and production-trigger completions, show one blocking summary at a time, and remove only the acknowledged entry.