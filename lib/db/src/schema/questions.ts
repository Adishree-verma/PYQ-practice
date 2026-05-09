import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { chaptersTable } from "./chapters";

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id),
  text: text("text").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  difficulty: text("difficulty").notNull(),
  year: integer("year"),
  source: text("source").notNull(),
  concept: text("concept").notNull(),
  correctOption: integer("correct_option").notNull(),
  explanation: text("explanation").notNull(),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
