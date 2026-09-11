import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launchRankingComparisonsFor } from '../src/launchRanking.js';

test('ranking percentages compare against other submissions and use the correct direction', () => {
  const submission = {
    sessionId: 'target',
    timeTakenSeconds: 100,
    totalItemsProduced: 1000,
    totalSciencePacksProduced: 100,
    totalIronCopperMined: 500,
    rank: 3,
    totalSubmissions: 5,
    alreadySubmitted: false,
    records: [
      { sessionId: 'target', timeTakenSeconds: 100, totalItemsProduced: 1000, totalSciencePacksProduced: 100, totalIronCopperMined: 500 },
      { sessionId: 'slower-higher', timeTakenSeconds: 120, totalItemsProduced: 1100, totalSciencePacksProduced: 110, totalIronCopperMined: 550 },
      { sessionId: 'faster-lower', timeTakenSeconds: 80, totalItemsProduced: 900, totalSciencePacksProduced: 90, totalIronCopperMined: 450 },
      { sessionId: 'slower-slight', timeTakenSeconds: 110, totalItemsProduced: 1025, totalSciencePacksProduced: 102, totalIronCopperMined: 510 },
      { sessionId: 'faster-slight', timeTakenSeconds: 90, totalItemsProduced: 975, totalSciencePacksProduced: 98, totalIronCopperMined: 490 },
    ],
  };

  assert.deepEqual(launchRankingComparisonsFor(submission), {
    timeFasterThan: 50,
    itemsMoreThan: 50,
    sciencePacksMoreThan: 50,
    ironCopperMoreThan: 50,
  });
});

test('ranking percentages are zero when there are no other submissions', () => {
  const submission = {
    sessionId: 'only-submission',
    timeTakenSeconds: 100,
    totalItemsProduced: 1000,
    totalSciencePacksProduced: 100,
    totalIronCopperMined: 500,
    rank: 1,
    totalSubmissions: 1,
    alreadySubmitted: false,
    records: [
      { sessionId: 'only-submission', timeTakenSeconds: 100, totalItemsProduced: 1000, totalSciencePacksProduced: 100, totalIronCopperMined: 500 },
    ],
  };

  assert.deepEqual(launchRankingComparisonsFor(submission), {
    timeFasterThan: 0,
    itemsMoreThan: 0,
    sciencePacksMoreThan: 0,
    ironCopperMoreThan: 0,
  });
});