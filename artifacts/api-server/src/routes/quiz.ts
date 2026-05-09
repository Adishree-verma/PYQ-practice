import { Router, type IRouter } from "express";
import { db, quizSessionsTable, sessionAnswersTable, questionsTable, userStatsTable, dailyActivityTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateQuizSessionBody,
  GetQuizSessionParams,
  SubmitAnswerParams,
  SubmitAnswerBody,
  CompleteQuizSessionParams,
  GetAnswerKeyParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/quiz-sessions", async (req, res): Promise<void> => {
  const parsed = CreateQuizSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { chapterId, questionCount, difficulty, questionIds } = parsed.data;

  const [session] = await db
    .insert(quizSessionsTable)
    .values({
      chapterId,
      questionCount,
      difficulty,
      questionIds,
      status: "active",
    })
    .returning();

  res.status(201).json({
    id: session.id,
    chapterId: session.chapterId,
    questionCount: session.questionCount,
    difficulty: session.difficulty,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
  });
});

router.get("/quiz-sessions/:sessionId", async (req, res): Promise<void> => {
  const params = GetQuizSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(quizSessionsTable)
    .where(eq(quizSessionsTable.id, params.data.sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const questionIds = session.questionIds as number[];
  const questions = questionIds.length > 0
    ? await db.select().from(questionsTable).where(
        sql`${questionsTable.id} = ANY(${sql`ARRAY[${sql.join(questionIds.map((id) => sql`${id}`), sql`, `)}]`})`
      )
    : [];

  const answers = await db
    .select()
    .from(sessionAnswersTable)
    .where(eq(sessionAnswersTable.sessionId, session.id));

  res.json({
    id: session.id,
    chapterId: session.chapterId,
    questionCount: session.questionCount,
    difficulty: session.difficulty,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    questions: questions.map((q) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
    })),
    answers: answers.map((a) => ({
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      isCorrect: a.isCorrect,
      timeTakenSeconds: a.timeTakenSeconds,
    })),
  });
});

router.post("/quiz-sessions/:sessionId/answers", async (req, res): Promise<void> => {
  const params = SubmitAnswerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SubmitAnswerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { sessionId } = params.data;
  const { questionId, selectedOption, timeTakenSeconds } = body.data;

  const [question] = await db.select().from(questionsTable).where(eq(questionsTable.id, questionId));
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const isCorrect = selectedOption === question.correctOption;

  const existing = await db
    .select()
    .from(sessionAnswersTable)
    .where(and(eq(sessionAnswersTable.sessionId, sessionId), eq(sessionAnswersTable.questionId, questionId)));

  if (existing.length > 0) {
    await db
      .update(sessionAnswersTable)
      .set({ selectedOption, isCorrect, timeTakenSeconds })
      .where(and(eq(sessionAnswersTable.sessionId, sessionId), eq(sessionAnswersTable.questionId, questionId)));
  } else {
    await db.insert(sessionAnswersTable).values({
      sessionId,
      questionId,
      selectedOption,
      isCorrect,
      timeTakenSeconds,
    });
  }

  res.json({ questionId, isCorrect, correctOption: question.correctOption });
});

router.post("/quiz-sessions/:sessionId/complete", async (req, res): Promise<void> => {
  const params = CompleteQuizSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { sessionId } = params.data;

  const [session] = await db.select().from(quizSessionsTable).where(eq(quizSessionsTable.id, sessionId));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await db
    .update(quizSessionsTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(quizSessionsTable.id, sessionId));

  const answers = await db.select().from(sessionAnswersTable).where(eq(sessionAnswersTable.sessionId, sessionId));

  const totalQuestions = session.questionCount;
  const correctCount = answers.filter((a) => a.isCorrect === true).length;
  const wrongCount = answers.filter((a) => a.isCorrect === false).length;
  const skippedCount = totalQuestions - answers.length;
  const totalTimeSeconds = answers.reduce((sum, a) => sum + a.timeTakenSeconds, 0);
  const averageTimeSeconds = answers.length > 0 ? totalTimeSeconds / answers.length : 0;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const [stats] = await db.select().from(userStatsTable);
  let currentCorrectStreak = stats?.currentCorrectStreak ?? 0;
  let bestCorrectStreak = stats?.bestCorrectStreak ?? 0;

  for (const answer of answers) {
    if (answer.isCorrect) {
      currentCorrectStreak++;
      if (currentCorrectStreak > bestCorrectStreak) bestCorrectStreak = currentCorrectStreak;
    } else {
      currentCorrectStreak = 0;
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const [existingActivity] = await db.select().from(dailyActivityTable).where(eq(dailyActivityTable.date, today));

  if (existingActivity) {
    await db
      .update(dailyActivityTable)
      .set({
        questionsAttempted: existingActivity.questionsAttempted + answers.length,
        correctCount: existingActivity.correctCount + correctCount,
      })
      .where(eq(dailyActivityTable.date, today));
  } else {
    await db.insert(dailyActivityTable).values({
      date: today,
      questionsAttempted: answers.length,
      correctCount,
    });
  }

  if (stats) {
    await db
      .update(userStatsTable)
      .set({
        totalQuestionsAttempted: stats.totalQuestionsAttempted + answers.length,
        totalCorrect: stats.totalCorrect + correctCount,
        totalWrong: stats.totalWrong + wrongCount,
        currentCorrectStreak,
        bestCorrectStreak,
      })
      .where(eq(userStatsTable.id, stats.id));
  } else {
    await db.insert(userStatsTable).values({
      totalQuestionsAttempted: answers.length,
      totalCorrect: correctCount,
      totalWrong: wrongCount,
      currentCorrectStreak,
      bestCorrectStreak,
    });
  }

  res.json({
    sessionId,
    totalQuestions,
    correctCount,
    wrongCount,
    skippedCount,
    totalTimeSeconds,
    averageTimeSeconds,
    score,
    currentStreak: currentCorrectStreak,
    bestStreak: bestCorrectStreak,
  });
});

router.get("/quiz-sessions/:sessionId/answer-key", async (req, res): Promise<void> => {
  const params = GetAnswerKeyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { sessionId } = params.data;

  const [session] = await db.select().from(quizSessionsTable).where(eq(quizSessionsTable.id, sessionId));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const questionIds = session.questionIds as number[];
  const questions = questionIds.length > 0
    ? await db.select().from(questionsTable).where(
        sql`${questionsTable.id} = ANY(${sql`ARRAY[${sql.join(questionIds.map((id) => sql`${id}`), sql`, `)}]`})`
      )
    : [];

  const answers = await db.select().from(sessionAnswersTable).where(eq(sessionAnswersTable.sessionId, sessionId));

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  const answerKey = questions.map((q) => {
    const userAnswer = answerMap.get(q.id);
    return {
      questionId: q.id,
      questionText: q.text,
      options: Array.isArray(q.options) ? q.options : [],
      correctOption: q.correctOption,
      selectedOption: userAnswer?.selectedOption ?? null,
      isCorrect: userAnswer?.isCorrect ?? null,
      explanation: q.explanation,
      year: q.year,
      source: q.source,
      difficulty: q.difficulty,
    };
  });

  res.json(answerKey);
});

export default router;
