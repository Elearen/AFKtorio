export const prioritizeDisplayOrder = <T>(
  items: T[],
  keyFor: (item: T) => string | readonly string[],
  preferredOrder: readonly string[],
) => {
  const priority = new Map(preferredOrder.map((key, index) => [key, index]));
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aValue = keyFor(a.item);
      const bValue = keyFor(b.item);
      const aKeys = typeof aValue === 'string' ? [aValue] : aValue;
      const bKeys = typeof bValue === 'string' ? [bValue] : bValue;
      for (let index = 0; index < Math.max(aKeys.length, bKeys.length); index += 1) {
        const aPriority = priority.get(aKeys[index]) ?? preferredOrder.length;
        const bPriority = priority.get(bKeys[index]) ?? preferredOrder.length;
        if (aPriority !== bPriority) return aPriority - bPriority;
      }
      return a.index - b.index;
    })
    .map(({ item }) => item);
};