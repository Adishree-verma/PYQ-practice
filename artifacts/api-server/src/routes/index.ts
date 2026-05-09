import { Router, type IRouter } from "express";
import healthRouter from "./health";
import subjectsRouter from "./subjects";
import chaptersRouter from "./chapters";
import questionsRouter from "./questions";
import quizRouter from "./quiz";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(subjectsRouter);
router.use(chaptersRouter);
router.use(questionsRouter);
router.use(quizRouter);
router.use(statsRouter);

export default router;
