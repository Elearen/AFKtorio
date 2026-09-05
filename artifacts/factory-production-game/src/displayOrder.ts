export const preferredRecipeOrder = [
  'basic-oil-processing',
  'advanced-oil-processing',
  'heavy-oil-cracking',
  'light-oil-cracking',
  'lubricant',
  'sulfur',
  'sulfuric-acid',
  'plastic-bar',
] as const;

export const prioritizeDisplayOrder = <T>(
  items: T[],
  keyFor: (item: T) => string,
  preferredOrder: readonly string[],
) => {
  const priority = new Map(preferredOrder.map((key, index) => [key, index]));
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aPriority = priority.get(keyFor(a.item)) ?? preferredOrder.length;
      const bPriority = priority.get(keyFor(b.item)) ?? preferredOrder.length;
      return aPriority - bPriority || a.index - b.index;
    })
    .map(({ item }) => item);
};