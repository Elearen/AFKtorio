type LaunchRankingRecord = {
  sessionId: string;
  timeTakenSeconds: number;
  totalItemsProduced: number;
  totalSciencePacksProduced: number;
  totalIronCopperMined: number;
};

type LaunchRankingSubmission = LaunchRankingRecord & {
  records?: readonly LaunchRankingRecord[];
};

export type LaunchRankingComparisons = {
  timeFasterThan: number;
  itemsMoreThan: number;
  sciencePacksMoreThan: number;
  ironCopperMoreThan: number;
};

export const launchRankingComparisonsFor = (submission: LaunchRankingSubmission): LaunchRankingComparisons => {
  const records = submission.records?.filter((record) => record.sessionId !== submission.sessionId) ?? [];
  const percentageFor = (matches: number) => records.length === 0 ? 0 : Math.round((matches / records.length) * 100);
  return {
    timeFasterThan: percentageFor(records.filter((record) => record.timeTakenSeconds > submission.timeTakenSeconds).length),
    itemsMoreThan: percentageFor(records.filter((record) => record.totalItemsProduced > submission.totalItemsProduced).length),
    sciencePacksMoreThan: percentageFor(records.filter((record) => record.totalSciencePacksProduced > submission.totalSciencePacksProduced).length),
    ironCopperMoreThan: percentageFor(records.filter((record) => record.totalIronCopperMined > submission.totalIronCopperMined).length),
  };
};