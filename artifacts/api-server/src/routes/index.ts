import { Router, type IRouter } from "express";
import healthRouter from "./health";
import launchRankingsRouter from "./launchRankings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(launchRankingsRouter);

export default router;
