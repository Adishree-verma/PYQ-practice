import { Router, type IRouter } from "express";
import { db, questionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { GetQuestionsQueryParams, GetMoreQuestionsBody, GenerateQuestionsBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/questions", async (req, res): Promise<void> => {
  const parsed = GetQuestionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { chapterId, count, difficulty } = parsed.data;

  let baseQuery = db.select().from(questionsTable);

  const conditions = [eq(questionsTable.chapterId, chapterId)];
  if (difficulty && difficulty !== "mixed") {
    conditions.push(eq(questionsTable.difficulty, difficulty));
  }

  const questions = await baseQuery
    .where(and(...conditions))
    .orderBy(sql`RANDOM()`)
    .limit(count);

  res.json(questions.map(q => ({ ...q, diagram: null })));
});

router.post("/questions/generate", async (req, res): Promise<void> => {
  const parsed = GenerateQuestionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { topic, count, difficulty } = parsed.data;

  const difficultyLabel =
    difficulty === "mixed"
      ? "a realistic mix of easy (25%), medium (50%), and hard (25%)"
      : difficulty;

  const prompt = `You are a senior question paper setter for India's most competitive exams: JEE Advanced, NEET, UPSC Mains/Prelims, SSC CGL, GATE, and CAT. Your questions must reflect the actual difficulty and depth of these exams — NOT simplified paraphrases.

Generate exactly ${count} multiple-choice questions on the topic: "${topic}" at ${difficultyLabel} difficulty.

STRICT QUALITY RULES:
1. Questions must require genuine reasoning, multi-step calculation, or deep conceptual understanding — not mere recall.
2. Use real numbers, formulas, physical constants, and specific values (e.g. "A wire of length 2m, resistance 4Ω...").
3. For topics that involve diagrams (circuits, graphs, geometric figures, ray diagrams, free body diagrams, statistical tables, maps, structural formulas, flowcharts):
   - You MUST include a "diagram" field containing an ASCII/text representation of the figure.
   - ASCII diagrams should use characters like |, ─, /, \\, +, >, <, ~, *, ●, ○, →, ↑, ↓, △, □ to depict the figure.
   - Examples: circuit diagrams, inclined plane setups, optical ray paths, coordinate geometry figures, titration curves, Indian map regions, food chain flowcharts.
4. Distractors (wrong options) must be plausible — common calculation mistakes, sign errors, or conceptual confusions — not obviously wrong.
5. Each explanation must show the complete solution/working, not just state the answer.
6. Source must be specific: "JEE Advanced 2022 Paper 1", "NEET 2021", "UPSC Prelims 2023", "SSC CGL Tier 1 2022", "GATE 2023 (EC)", etc.

Return a JSON array of exactly ${count} objects. Each object must have ALL these fields:
- "text": full question text, including any "refer to the figure/diagram" references (string)
- "diagram": ASCII/text diagram if the question involves a figure, otherwise null
- "options": array of exactly 4 strings (no A/B/C/D prefix)
- "correctOption": 0-indexed integer (0, 1, 2, or 3)
- "explanation": complete step-by-step working showing how to reach the answer
- "year": realistic year 2015–2024 (integer)
- "source": specific exam and year (string)
- "difficulty": "easy", "medium", or "hard" (string)
- "concept": precise sub-concept name, e.g. "Wheatstone Bridge", "Hardy-Weinberg Equilibrium", "Article 356" (string)

Return ONLY the raw JSON array. No markdown, no code fences, no commentary.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const generated = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const questions = (generated as Record<string, unknown>[]).map((q, idx) => ({
      id: -(idx + 1),
      chapterId: 0,
      text: String(q.text ?? ""),
      diagram: q.diagram != null ? String(q.diagram) : null,
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      difficulty: (["easy", "medium", "hard"].includes(String(q.difficulty))
        ? String(q.difficulty)
        : "medium") as "easy" | "medium" | "hard",
      year: typeof q.year === "number" ? q.year : null,
      source: String(q.source ?? "Practice Question"),
      concept: String(q.concept ?? topic),
      correctOption: typeof q.correctOption === "number" ? q.correctOption : 0,
      explanation: String(q.explanation ?? ""),
    }));

    res.json(questions);
  } catch {
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

router.post("/questions/more", async (req, res): Promise<void> => {
  const parsed = GetMoreQuestionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { concept, chapterId, difficulty, excludeIds } = parsed.data;

  const existingQuestions = await db
    .select()
    .from(questionsTable)
    .where(
      and(
        eq(questionsTable.chapterId, chapterId),
        eq(questionsTable.difficulty, difficulty),
        eq(questionsTable.concept, concept)
      )
    )
    .limit(5);

  const available = existingQuestions.filter((q) => !excludeIds.includes(q.id));
  if (available.length >= 3) {
    res.json(available.slice(0, 3).map(q => ({ ...q, diagram: null })));
    return;
  }

  const prompt = `You are a senior question setter for JEE Advanced, NEET, UPSC, SSC. Generate 3 challenging multiple-choice questions on the concept: "${concept}" at ${difficulty} difficulty. Use real values, formulas, and reasoning. Include ASCII diagrams where relevant.

Return a JSON array of exactly 3 objects with fields: text, diagram (string or null), options (4 items), correctOption (0-3), explanation (step-by-step), year (integer), source (specific exam name).

Return ONLY the raw JSON array.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_completion_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const generated = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const questions = generated.map((q: Record<string, unknown>, idx: number) => ({
      id: -(idx + 1),
      chapterId,
      text: String(q.text),
      diagram: q.diagram != null ? String(q.diagram) : null,
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      difficulty,
      year: typeof q.year === "number" ? q.year : null,
      source: String(q.source ?? `Practice Question`),
      concept,
      correctOption: typeof q.correctOption === "number" ? q.correctOption : 0,
      explanation: String(q.explanation ?? ""),
    }));

    res.json(questions);
  } catch {
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

export default router;
