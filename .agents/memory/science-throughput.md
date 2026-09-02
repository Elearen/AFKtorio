---
name: Science throughput
description: Shared rules for active research, lab consumption, and science-pack production bottlenecks.
---

The active research selection is shared between the Research and Science tabs. Labs advance continuously at their research-unit rate and consume each technology's configured amount of every required science pack for the matching fractional progress.

**Why:** Science demand depends on the selected technology, not merely on whether any science inventory exists; consuming the first available pack produces incorrect research behavior.

**How to apply:** Treat research-unit speed as labs × lab speed ÷ base research time, with lab speed 1 and a 30-second fallback. Multiply fractional progress by each pack amount for pack demand; stop progress when any required pack is exhausted. Current SPM comes from recent consumption and peak SPM is supply-bottlenecked.

Auto research is an ordered selection, not a parallel scheduler: the first checked incomplete technology in catalog order owns the labs, and later checked technologies wait until it completes.

The Science tab's lab card reports aggregate current and peak science-pack usage alongside lab cycle capacity and shared construction-queue progress for new labs.

**Why:** Lab construction and input demand are the two constraints players need to see together when expanding research capacity.

**How to apply:** Keep the lab card aligned with Production cards: show the lab count/status, construction inputs, usage metrics, queue progress, and inline inspect/build controls.

Recent production samples distinguish automated output from manual output, and legacy samples without that source marker are discarded on load.

**Why:** A current rate that includes handcrafting or stale samples from an earlier simulation model can exceed an automated-only peak and make a healthy line look inconsistent.

**How to apply:** Keep peak production source-compatible with current production, and invalidate transient rate history whenever its source model changes.

Assembler cycle progress must never accumulate completed-cycle backlog while inputs, power, or output storage are blocked; retain only fractional in-cycle progress.

**Why:** Releasing starvation backlog later creates a short production burst above the theoretical machine peak, even though the long-run recipe rate is correct.

**How to apply:** Clamp legacy progress before each tick and reduce blocked residual progress modulo one cycle after attempted production.

Nearly full output storage throttles automated recipes to recent downstream demand, while the separate peak metric continues to represent unconstrained machine capacity.

**Why:** A full buffer has nowhere to accept peak output; showing or producing at theoretical capacity makes balanced lines appear to overproduce.

**How to apply:** Treat buffers at 95% capacity or higher as constrained, scale automated cycle/mining progress by demand/peak, and cap the displayed live rate to demand while constrained.

**Why:** The game needs deterministic one-at-a-time progression while still allowing players to plan a research path ahead of available prerequisites.

**How to apply:** Keep auto selections normalized to catalog order and block later entries when the first pending selection is not yet available.

The Research screen’s live summary uses lab units per minute for the active lab-driven technology and estimates completion from remaining units; production-trigger technologies show a waiting state instead.

**Why:** Trigger-based unlocks do not advance through labs, so presenting a lab rate or numeric ETA for them would be misleading.

**How to apply:** Keep trigger progress visible on the technology card, but use a waiting label rather than inventing a research rate or completion time.

Research completions are persisted as an ordered acknowledgement queue rendered by the top-level game shell, so completion summaries cannot be missed when the player is viewing another tab.

**Why:** Research advances in the background and can complete while the user is away from the Technology screen.

**How to apply:** Queue both lab-driven and production-trigger completions, show one blocking summary at a time, and remove only the acknowledged entry.