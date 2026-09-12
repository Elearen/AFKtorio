import { and, asc, eq, gt, lt, or, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, launchRankingsTable } from "@workspace/db";
import { SubmitLaunchRankingBody, SubmitLaunchRankingResponse } from "@workspace/api-zod";

const router: IRouter = Router();

type RankingCandidate = {
  sessionId: string;
  timeTakenSeconds: number;
  totalItemsProduced: number;
  totalSciencePacksProduced: number;
  totalIronCopperMined: number;
};

const rankingRecordsFor = () => db
  .select({
    sessionId: launchRankingsTable.sessionId,
    timeTakenSeconds: launchRankingsTable.timeTakenSeconds,
    totalItemsProduced: launchRankingsTable.totalItemsProduced,
    totalSciencePacksProduced: launchRankingsTable.totalSciencePacksProduced,
    totalIronCopperMined: launchRankingsTable.totalIronCopperMined,
  })
  .from(launchRankingsTable)
  .orderBy(asc(launchRankingsTable.id));

const rankingIsAheadOf = (record: RankingCandidate, candidate: RankingCandidate) => (
  record.timeTakenSeconds < candidate.timeTakenSeconds
  || (record.timeTakenSeconds === candidate.timeTakenSeconds && record.totalItemsProduced > candidate.totalItemsProduced)
);

const queryValue = (value: unknown) => Array.isArray(value) ? value[0] : value;
const previewNumber = (value: unknown) => {
  const parsed = Number(queryValue(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

router.get("/launch-rankings", async (req, res): Promise<void> => {
  const sessionId = queryValue(req.query.sessionId);
  const timeTakenSeconds = previewNumber(req.query.timeTakenSeconds);
  const totalItemsProduced = previewNumber(req.query.totalItemsProduced);
  const totalSciencePacksProduced = previewNumber(req.query.totalSciencePacksProduced);
  const totalIronCopperMined = previewNumber(req.query.totalIronCopperMined);
  if (
    typeof sessionId !== "string"
    || sessionId.length < 1
    || sessionId.length > 128
    || timeTakenSeconds === null
    || !Number.isInteger(timeTakenSeconds)
    || totalItemsProduced === null
    || totalSciencePacksProduced === null
    || totalIronCopperMined === null
  ) {
    res.status(400).json({ error: "Invalid launch ranking preview data." });
    return;
  }

  const candidate: RankingCandidate = { sessionId, timeTakenSeconds, totalItemsProduced, totalSciencePacksProduced, totalIronCopperMined };
  const records = await rankingRecordsFor();
  const existing = records.find((record) => record.sessionId === candidate.sessionId);
  const target = existing ?? candidate;
  const visibleRecords = existing ? records : [...records, candidate];
  const ahead = records.filter((record) => record.sessionId !== target.sessionId && rankingIsAheadOf(record, target));
  const response = SubmitLaunchRankingResponse.parse({
    ...target,
    rank: ahead.length + 1,
    totalSubmissions: visibleRecords.length,
    alreadySubmitted: Boolean(existing),
    records: visibleRecords,
  });
  res.json(response);
});

router.post("/launch-rankings", async (req, res): Promise<void> => {
  const parsed = SubmitLaunchRankingBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid launch ranking submission");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!Number.isInteger(parsed.data.timeTakenSeconds)) {
    req.log.warn("Launch ranking time must be a whole number of seconds");
    res.status(400).json({ error: "timeTakenSeconds must be a whole number." });
    return;
  }

  const [inserted] = await db
    .insert(launchRankingsTable)
    .values(parsed.data)
    .onConflictDoNothing({ target: launchRankingsTable.sessionId })
    .returning();

  const [ranking] = inserted
    ? [inserted]
    : await db
      .select()
      .from(launchRankingsTable)
      .where(eq(launchRankingsTable.sessionId, parsed.data.sessionId))
      .limit(1);

  if (!ranking) {
    req.log.error({ sessionId: parsed.data.sessionId }, "Launch ranking row was not found after submission");
    res.status(500).json({ error: "Could not save launch ranking." });
    return;
  }

  const ahead = await db
    .select({ id: launchRankingsTable.id })
    .from(launchRankingsTable)
    .where(or(
      lt(launchRankingsTable.timeTakenSeconds, ranking.timeTakenSeconds),
      and(
        eq(launchRankingsTable.timeTakenSeconds, ranking.timeTakenSeconds),
        gt(launchRankingsTable.totalItemsProduced, ranking.totalItemsProduced),
      ),
      and(
        eq(launchRankingsTable.timeTakenSeconds, ranking.timeTakenSeconds),
        eq(launchRankingsTable.totalItemsProduced, ranking.totalItemsProduced),
        lt(launchRankingsTable.id, ranking.id),
      ),
    ))
    .orderBy(asc(launchRankingsTable.timeTakenSeconds), asc(launchRankingsTable.id));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(launchRankingsTable);

  const records = await db
    .select({
      sessionId: launchRankingsTable.sessionId,
      timeTakenSeconds: launchRankingsTable.timeTakenSeconds,
      totalItemsProduced: launchRankingsTable.totalItemsProduced,
      totalSciencePacksProduced: launchRankingsTable.totalSciencePacksProduced,
      totalIronCopperMined: launchRankingsTable.totalIronCopperMined,
    })
    .from(launchRankingsTable)
    .orderBy(asc(launchRankingsTable.id));

  const response = SubmitLaunchRankingResponse.parse({
    sessionId: ranking.sessionId,
    timeTakenSeconds: ranking.timeTakenSeconds,
    totalItemsProduced: ranking.totalItemsProduced,
    totalSciencePacksProduced: ranking.totalSciencePacksProduced,
    totalIronCopperMined: ranking.totalIronCopperMined,
    rank: ahead.length + 1,
    totalSubmissions: Number(count),
    alreadySubmitted: !inserted,
    records,
  });

  res.json(response);
});

export default router;