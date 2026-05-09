import { Router, type IRouter } from "express";
import { db, userStatsTable, dailyActivityTable, sessionAnswersTable, questionsTable, chaptersTable, subjectsTable, quizSessionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

const MOTIVATIONAL_MESSAGES = [
  "Let's solve some problems today!",
  "Your streak is waiting — don't break it!",
  "Every question you solve brings you closer to your goal!",
  "Champions practice daily. Are you in?",
  "One question at a time. You've got this!",
  "Your future self will thank you for studying today.",
  "The best time to practice is now!",
  "Consistency beats intensity. Keep going!",
];

async function buildUserStatsResponse(stats: typeof userStatsTable.$inferSelect | null, activityRecords: (typeof dailyActivityTable.$inferSelect)[], dates: string[]) {
  const activityMap = new Map(activityRecords.map((a) => [a.date, a]));
  const weeklyActivity = dates.map((date) => {
    const record = activityMap.get(date);
    return { date, questionsAttempted: record?.questionsAttempted ?? 0, correctCount: record?.correctCount ?? 0 };
  });
  const totalAttempted = stats?.totalQuestionsAttempted ?? 0;
  const totalCorrect = stats?.totalCorrect ?? 0;
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  return {
    name: stats?.name ?? "Challenger",
    examType: stats?.examType ?? null,
    totalQuestionsAttempted: totalAttempted,
    totalCorrect,
    totalWrong: stats?.totalWrong ?? 0,
    accuracy,
    currentDayStreak: stats?.currentDayStreak ?? 0,
    bestDayStreak: stats?.bestDayStreak ?? 0,
    currentCorrectStreak: stats?.currentCorrectStreak ?? 0,
    bestCorrectStreak: stats?.bestCorrectStreak ?? 0,
    lastCheckIn: stats?.lastCheckIn?.toISOString() ?? null,
    weeklyActivity,
  };
}

router.get("/user-stats", async (_req, res): Promise<void> => {
  const [stats] = await db.select().from(userStatsTable);
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  const activityRecords = await db.select().from(dailyActivityTable);
  res.json(await buildUserStatsResponse(stats ?? null, activityRecords, dates));
});

router.post("/user-stats/check-in", async (_req, res): Promise<void> => {
  const [stats] = await db.select().from(userStatsTable);
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (stats) {
    const lastCheckIn = stats.lastCheckIn;
    let newStreak = stats.currentDayStreak;
    let bestStreak = stats.bestDayStreak;

    if (lastCheckIn) {
      const lastDate = lastCheckIn.toISOString().split("T")[0];
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastDate === today) {
        // Already checked in today
      } else if (lastDate === yesterdayStr) {
        newStreak = newStreak + 1;
        if (newStreak > bestStreak) bestStreak = newStreak;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
      if (newStreak > bestStreak) bestStreak = newStreak;
    }

    await db.update(userStatsTable).set({ currentDayStreak: newStreak, bestDayStreak: bestStreak, lastCheckIn: now }).where(eq(userStatsTable.id, stats.id));
    const msgIdx = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
    res.json({ currentDayStreak: newStreak, bestDayStreak: bestStreak, message: MOTIVATIONAL_MESSAGES[msgIdx] });
  } else {
    await db.insert(userStatsTable).values({ currentDayStreak: 1, bestDayStreak: 1, lastCheckIn: now });
    res.json({ currentDayStreak: 1, bestDayStreak: 1, message: MOTIVATIONAL_MESSAGES[0] });
  }
});

router.get("/user-stats/leaderboard", async (_req, res): Promise<void> => {
  const leaderboard = [
    { rank: 1, name: "Arjun K.", dayStreak: 45, totalQuestions: 1240 },
    { rank: 2, name: "Priya S.", dayStreak: 38, totalQuestions: 980 },
    { rank: 3, name: "Rohan M.", dayStreak: 31, totalQuestions: 870 },
    { rank: 4, name: "Sneha P.", dayStreak: 28, totalQuestions: 760 },
    { rank: 5, name: "You", dayStreak: 0, totalQuestions: 0 },
  ];
  const [stats] = await db.select().from(userStatsTable);
  if (stats) {
    leaderboard[4].dayStreak = stats.currentDayStreak;
    leaderboard[4].totalQuestions = stats.totalQuestionsAttempted;
    leaderboard.sort((a, b) => b.dayStreak - a.dayStreak);
    leaderboard.forEach((entry, i) => { entry.rank = i + 1; });
  }
  res.json(leaderboard);
});

router.patch("/user-stats/profile", async (req, res): Promise<void> => {
  const { name, examType } = req.body as { name?: string; examType?: string | null };
  const [stats] = await db.select().from(userStatsTable);

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (examType !== undefined) updates.examType = examType;

  if (stats) {
    await db.update(userStatsTable).set(updates).where(eq(userStatsTable.id, stats.id));
  } else {
    await db.insert(userStatsTable).values({ name: name ?? "Challenger", examType: examType ?? null });
  }

  const [updated] = await db.select().from(userStatsTable);
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  const activityRecords = await db.select().from(dailyActivityTable);
  res.json(await buildUserStatsResponse(updated ?? null, activityRecords, dates));
});

router.get("/user-stats/analytics", async (_req, res): Promise<void> => {
  // 30-day activity
  const dates: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  const activityRecords = await db.select().from(dailyActivityTable);
  const activityMap = new Map(activityRecords.map((a) => [a.date, a]));
  const thirtyDayActivity = dates.map((date) => {
    const record = activityMap.get(date);
    return { date, questionsAttempted: record?.questionsAttempted ?? 0, correctCount: record?.correctCount ?? 0 };
  });

  // Subject performance: join session_answers → questions → chapters → subjects
  const subjectRows = await db
    .select({
      subjectName: subjectsTable.name,
      subjectColor: subjectsTable.color,
      isCorrect: sessionAnswersTable.isCorrect,
      difficulty: questionsTable.difficulty,
    })
    .from(sessionAnswersTable)
    .innerJoin(questionsTable, eq(sessionAnswersTable.questionId, questionsTable.id))
    .innerJoin(chaptersTable, eq(questionsTable.chapterId, chaptersTable.id))
    .innerJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id));

  const subjectMap = new Map<string, { subjectName: string; subjectColor: string; correct: number; wrong: number; total: number }>();
  const difficultyMap = new Map<string, { difficulty: string; correct: number; wrong: number; total: number }>();

  for (const row of subjectRows) {
    // Subject
    if (!subjectMap.has(row.subjectName)) {
      subjectMap.set(row.subjectName, { subjectName: row.subjectName, subjectColor: row.subjectColor, correct: 0, wrong: 0, total: 0 });
    }
    const subj = subjectMap.get(row.subjectName)!;
    subj.total++;
    if (row.isCorrect === true) subj.correct++;
    else if (row.isCorrect === false) subj.wrong++;

    // Difficulty
    if (!difficultyMap.has(row.difficulty)) {
      difficultyMap.set(row.difficulty, { difficulty: row.difficulty, correct: 0, wrong: 0, total: 0 });
    }
    const diff = difficultyMap.get(row.difficulty)!;
    diff.total++;
    if (row.isCorrect === true) diff.correct++;
    else if (row.isCorrect === false) diff.wrong++;
  }

  const subjectPerformance = Array.from(subjectMap.values()).map((s) => ({
    ...s,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
  }));

  const difficultyBreakdown = Array.from(difficultyMap.values());

  // Total sessions
  const sessions = await db.select({ id: quizSessionsTable.id }).from(quizSessionsTable);
  const totalSessions = sessions.length;

  // Total time (sum of timeTakenSeconds from session_answers / 60)
  const [timeRow] = await db
    .select({ total: sql<number>`coalesce(sum(${sessionAnswersTable.timeTakenSeconds}), 0)::int` })
    .from(sessionAnswersTable);
  const totalTimeMinutes = Math.round((timeRow?.total ?? 0) / 60);

  res.json({ thirtyDayActivity, subjectPerformance, difficultyBreakdown, totalSessions, totalTimeMinutes });
});

export default router;
