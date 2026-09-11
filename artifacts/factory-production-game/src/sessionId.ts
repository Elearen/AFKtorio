const sessionIdSeedFor = (timestamp: number) => {
  let seed = timestamp >>> 0;
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  return (seed ^ (seed >>> 16)) >>> 0;
};

export const sessionIdForStartTimestamp = (startTimestamp: number) => {
  const timestamp = Number.isFinite(startTimestamp) ? Math.max(0, Math.floor(startTimestamp)) : 0;
  const seed = sessionIdSeedFor(timestamp);
  return `afk-${timestamp.toString(36)}-${seed.toString(36).padStart(7, '0')}`;
};