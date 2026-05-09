import { pgTable, serial, integer, real, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userStatsTable = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Challenger"),
  examType: text("exam_type"),
  totalQuestionsAttempted: integer("total_questions_attempted").notNull().default(0),
  totalCorrect: integer("total_correct").notNull().default(0),
  totalWrong: integer("total_wrong").notNull().default(0),
  currentDayStreak: integer("current_day_streak").notNull().default(0),
  bestDayStreak: integer("best_day_streak").notNull().default(0),
  currentCorrectStreak: integer("current_correct_streak").notNull().default(0),
  bestCorrectStreak: integer("best_correct_streak").notNull().default(0),
  lastCheckIn: timestamp("last_check_in", { withTimezone: true }),
});

export const dailyActivityTable = pgTable("daily_activity", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  questionsAttempted: integer("questions_attempted").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
});

export const insertUserStatsSchema = createInsertSchema(userStatsTable).omit({ id: true });
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStatsTable.$inferSelect;

export const insertDailyActivitySchema = createInsertSchema(dailyActivityTable).omit({ id: true });
export type InsertDailyActivity = z.infer<typeof insertDailyActivitySchema>;
export type DailyActivity = typeof dailyActivityTable.$inferSelect;
