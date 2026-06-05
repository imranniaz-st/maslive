import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cronJobsTable = pgTable("cron_jobs", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").notNull(),
  toolName: text("tool_name").notNull(),
  target: text("target").notNull(),
  args: text("args").notNull().default(""),
  schedule: text("schedule").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  lastScanId: integer("last_scan_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCronJobSchema = createInsertSchema(cronJobsTable).omit({ id: true, createdAt: true });
export type InsertCronJob = z.infer<typeof insertCronJobSchema>;
export type CronJob = typeof cronJobsTable.$inferSelect;
