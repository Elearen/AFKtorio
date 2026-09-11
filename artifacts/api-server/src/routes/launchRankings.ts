import { and, asc, eq, gt, lt, or, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, launchRankingsTable } from "@workspace/db";
import { SubmitLaunchRankingBody, SubmitLaunchRankingResponse } from "@workspace/api-zod";

const router: IRouter = Router();

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