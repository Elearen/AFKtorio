import { Router, type IRouter } from "express";
import { db, gameSessionsTable } from "@workspace/db";
import { RegisterGameSessionBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/game-sessions", async (req, res): Promise<void> => {
  const parsed = RegisterGameSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!Number.isInteger(parsed.data.gameStartTimestamp)) {
    res.status(400).json({ error: "gameStartTimestamp must be a whole number." });
    return;
  }

  await db
    .insert(gameSessionsTable)
    .values(parsed.data)
    .onConflictDoNothing({ target: gameSessionsTable.sessionId });

  res.sendStatus(204);
});

export default router;