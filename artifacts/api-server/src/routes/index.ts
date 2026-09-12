import { Router, type IRouter } from "express";
import healthRouter from "./health";
import launchRankingsRouter from "./launchRankings";
import gameSessionsRouter from "./gameSessions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(launchRankingsRouter);
router.use(gameSessionsRouter);

export default router;
