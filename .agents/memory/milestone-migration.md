---
name: Milestone migration
description: Save migration rules for introducing welcome and milestone notifications to existing local saves.
---

Legacy saves predate milestone metadata, so absent fields must be treated as unviewed rather than dismissed. Existing progress should be preserved, and every milestone threshold already crossed should be queued once for the returning player.

**Why:** The welcome and milestone messages are part of the new player experience. Treating missing fields as “already seen” silently removes that experience from returning players, while resetting counters can corrupt their progress.

**How to apply:** Only explicit save metadata suppresses a notification. Keep pending notifications separate from the unlocked history: pending items are unviewed, while unlocked entries support the replay archive.