import { Router, type IRouter } from "express";
import { db, subjectsTable, chaptersTable, questionsTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.name);

  const result = await Promise.all(
    subjects.map(async (s) => {
      const chapters = await db
        .select({ id: chaptersTable.id })
        .from(chaptersTable)
        .where(eq(chaptersTable.subjectId, s.id));

      const chapterIds = chapters.map((c) => c.id);

      let totalQuestions = 0;
      if (chapterIds.length > 0) {
        const [row] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(questionsTable)
          .where(inArray(questionsTable.chapterId, chapterIds));
        totalQuestions = row?.count ?? 0;
      }

      return {
        id: s.id,
        name: s.name,
        icon: s.icon,
        color: s.color,
        totalChapters: chapterIds.length,
        totalQuestions,
      };
    })
  );

  res.json(result);
});

export default router;
