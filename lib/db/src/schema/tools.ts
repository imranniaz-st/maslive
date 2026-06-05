import { pgTable, text, serial, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const toolsTable = pgTable(
  "tools",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    command: text("command").notNull(),
    defaultArgs: text("default_args"),
    isBuiltin: boolean("is_builtin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tools_name_unique").on(table.name)],
);

export const insertToolSchema = createInsertSchema(toolsTable).omit({ id: true, createdAt: true });
export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof toolsTable.$inferSelect;
