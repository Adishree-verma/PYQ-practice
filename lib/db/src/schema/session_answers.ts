import { pgTable, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { quizSessionsTable } from "./quiz_sessions";
import { questionsTable } from "./questions";

export const sessionAnswersTable = pgTable("session_answers", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => quizSessionsTable.id),
  questionId: integer("question_id").notNull().references(() => questionsTable.id),
  selectedOption: integer("selected_option"),
  isCorrect: boolean("is_correct"),
  timeTakenSeconds: real("time_taken_seconds").notNull().default(0),
  answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSessionAnswerSchema = createInsertSchema(sessionAnswersTable).omit({ id: true, answeredAt: true });
export type InsertSessionAnswer = z.infer<typeof insertSessionAnswerSchema>;
export type SessionAnswer = typeof sessionAnswersTable.$inferSelect;
