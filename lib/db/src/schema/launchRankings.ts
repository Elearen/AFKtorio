import { createInsertSchema } from "drizzle-zod";
import { doublePrecision, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const launchRankingsTable = pgTable("launch_rankings", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  timeTakenSeconds: integer("time_taken_seconds").notNull(),
  totalItemsProduced: doublePrecision("total_items_produced").notNull(),
  totalSciencePacksProduced: doublePrecision("total_science_packs_produced").notNull(),
  totalIronCopperMined: doublePrecision("total_iron_copper_mined").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("launch_rankings_session_id_unique").on(table.sessionId),
]);

export const insertLaunchRankingSchema = createInsertSchema(launchRankingsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertLaunchRanking = z.infer<typeof insertLaunchRankingSchema>;
export type LaunchRanking = typeof launchRankingsTable.$inferSelect;