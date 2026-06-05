import { Router, type IRouter } from "express";
import healthRouter from "./health";
import toolsRouter from "./tools";
import scansRouter from "./scans";
import dashboardRouter from "./dashboard";
import cronJobsRouter from "./cron-jobs";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tools", toolsRouter);
router.use("/scans", scansRouter);
router.use("/dashboard", dashboardRouter);
router.use("/cron-jobs", cronJobsRouter);

export default router;
