export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
export const OFFLINE_RECONCILIATION_THRESHOLD_SECONDS = 2;
export const OFFLINE_REPORT_THRESHOLD_SECONDS = 60;

export const offlineElapsedSecondsFor = (lastSeen: number, now: number) =>
  Math.min(MAX_OFFLINE_SECONDS, Math.max(0, (now - lastSeen) / 1000));

export const shouldShowOfflineRecoveryReport = (away: number, recovered: number) =>
  away >= OFFLINE_REPORT_THRESHOLD_SECONDS && recovered > 0;