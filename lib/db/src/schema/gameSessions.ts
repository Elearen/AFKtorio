import { createInsertSchema } from "drizzle-zod";
import { doublePrecision, pgTable, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const gameSessionsTable = pgTable("game_sessions", {
  sessionId: text("session_id").primaryKey(),
  gameStartTimestamp: doublePrecision("game_start_timestamp").notNull(),
});

export const insertGameSessionSchema = createInsertSchema(gameSessionsTable);

export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessionsTable.$inferSelect;