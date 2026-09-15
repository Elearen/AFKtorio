export const updateHistorySourceUrl = 'https://1drv.ms/t/c/41f8ca83fd4ca79d/IQASjG_buEfiSpV2qKvtef3mAcAfAjdACGMBPaXcXRq3zeQ';

export const updateHistoryContent = `13/09/26

UI updates, mostly related to readability, excess clutter and highlighting bottlenecks.

Rebalanced coal mining to match base game. Fixed power badges for water bottlenecks.

12/09/26

Added save export/import. Edited saves don't get permanently saved in the rankings, but you can still compare your result.

Navbar visual update. Moved build quantity toggle to banner header.

11/09/26

Added rankings for game completion. Users can submit their first launch statistics and be judged on their speed and efficiency. Re-submitting will reload rankings as more are populated.

Added research queue priority, in selection order. Added research first button in technology details panel. Added auto-research toggle.

10/09/26

Added nuclear power and cleaned up power bugs (boiler-steam engine ratios, steam engine MW, labs MW).

Added storage item filters.

09/09/26

Added batch construction, unlocked with construction robotics. Worker robot speed upgrades increase construction speed.`;

const updateHistoryFingerprintFor = (content: string) => {
  let hash = 2166136261;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

export const updateHistoryVersion = updateHistoryFingerprintFor(updateHistoryContent);
export const updateHistoryChangedSince = (savedVersion: unknown) => savedVersion !== updateHistoryVersion;