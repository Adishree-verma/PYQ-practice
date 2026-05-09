import { Router, type IRouter } from "express";
import { db, chaptersTable, questionsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/subjects/:subjectId/chapters", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.subjectId) ? req.params.subjectId[0] : req.params.subjectId;
  const subjectId = parseInt(raw, 10);

  if (isNaN(subjectId)) {
    res.status(400).json({ error: "Invalid subjectId" });
    return;
  }

  const chapters = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.subjectId, subjectId))
    .orderBy(chaptersTable.name);

  const result = await Promise.all(
    chapters.map(async (ch) => {
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(questionsTable)
        .where(eq(questionsTable.chapterId, ch.id));

      const [easy] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(questionsTable)
        .where(and(eq(questionsTable.chapterId, ch.id), eq(questionsTable.difficulty, "easy")));

      const [medium] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(questionsTable)
        .where(and(eq(questionsTable.chapterId, ch.id), eq(questionsTable.difficulty, "medium")));

      const [hard] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(questionsTable)
        .where(and(eq(questionsTable.chapterId, ch.id), eq(questionsTable.difficulty, "hard")));

      return {
        id: ch.id,
        subjectId: ch.subjectId,
        name: ch.name,
        description: ch.description,
        totalQuestions: total?.count ?? 0,
        easyCount: easy?.count ?? 0,
        mediumCount: medium?.count ?? 0,
        hardCount: hard?.count ?? 0,
      };
    })
  );

  res.json(result);
});

export default router;
