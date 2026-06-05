import { Router } from "express";
import { db, cronJobsTable, toolsTable, scansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import cron, { type ScheduledTask } from "node-cron";
import {
  CreateCronJobBody,
  UpdateCronJobBody,
  GetCronJobParams,
  UpdateCronJobParams,
  DeleteCronJobParams,
  ToggleCronJobParams,
  RunCronJobNowParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

const activeJobs = new Map<number, ScheduledTask>();
const scanTimeoutMs = Number(process.env.SCAN_TIMEOUT_MS ?? 120000);

function mapJob(job: typeof cronJobsTable.$inferSelect) {
  return {
    id: job.id,
    toolId: job.toolId,
    toolName: job.toolName,
    target: job.target,
    args: job.args,
    schedule: job.schedule,
    enabled: job.enabled,
    lastRunAt: job.lastRunAt ? job.lastRunAt.toISOString() : null,
    nextRunAt: job.nextRunAt ? job.nextRunAt.toISOString() : null,
    lastScanId: job.lastScanId ?? null,
    createdAt: job.createdAt.toISOString(),
  };
}

function computeNextRun(schedule: string): Date | null {
  try {
    const task = cron.createTask(schedule, () => {});
    const nextRun = task.getNextRun();
    task.destroy();
    return nextRun;
  } catch {
    // ignore
  }
  return null;
}

async function executeTool(jobId: number, command: string, target: string, args: string, toolId: number, toolName: string) {
  const startTime = Date.now();
  const cmd = command;
  const cmdArgs = [...splitCommandArgs(args), target].filter(Boolean);
  const outputChunks: string[] = [];

  const [scan] = await db.insert(scansTable).values({
    toolId,
    toolName,
    target,
    args,
    status: "running",
  }).returning();

  await db.update(cronJobsTable).set({
    lastRunAt: new Date(),
    lastScanId: scan.id,
  }).where(eq(cronJobsTable.id, jobId));

  try {
    await new Promise<void>((resolve) => {
      const proc = spawn(cmd, cmdArgs, {
        timeout: Number.isFinite(scanTimeoutMs) && scanTimeoutMs > 0 ? scanTimeoutMs : 120000,
        shell: process.platform === "win32",
        windowsHide: true,
      });
      proc.stdout.on("data", (d: Buffer) => outputChunks.push(d.toString()));
      proc.stderr.on("data", (d: Buffer) => outputChunks.push(d.toString()));
      proc.on("close", async (code) => {
        const durationMs = Date.now() - startTime;
        await db.update(scansTable).set({
          status: code === 0 ? "completed" : "failed",
          output: outputChunks.join(""),
          exitCode: code ?? -1,
          durationMs,
          completedAt: new Date(),
        }).where(eq(scansTable.id, scan.id));
        resolve();
      });
      proc.on("error", async (err) => {
        const durationMs = Date.now() - startTime;
        await db.update(scansTable).set({
          status: "failed",
          output: outputChunks.join("") + `\nError: ${(err as Error).message}`,
          exitCode: -1,
          durationMs,
          completedAt: new Date(),
        }).where(eq(scansTable.id, scan.id));
        resolve();
      });
    });
  } catch {
    await db.update(scansTable).set({ status: "failed", output: "Timed out", exitCode: -1, completedAt: new Date() }).where(eq(scansTable.id, scan.id));
  }

  return scan;
}

function splitCommandArgs(args: string) {
  const matches = args.matchAll(/"([^"]*)"|'([^']*)'|[^\s]+/g);
  return Array.from(matches, (match) => match[1] ?? match[2] ?? match[0]);
}

function scheduleJob(job: typeof cronJobsTable.$inferSelect, tool: typeof toolsTable.$inferSelect) {
  if (activeJobs.has(job.id)) {
    activeJobs.get(job.id)!.stop();
    activeJobs.delete(job.id);
  }
  if (!job.enabled) return;
  if (!cron.validate(job.schedule)) {
    logger.warn({ jobId: job.id, schedule: job.schedule }, "Invalid cron schedule, skipping");
    return;
  }
  const task = cron.schedule(job.schedule, async () => {
    logger.info({ jobId: job.id, toolName: job.toolName }, "Running scheduled cron job");
    await executeTool(job.id, tool.command, job.target, job.args, tool.id, tool.name);
  });
  activeJobs.set(job.id, task);
  logger.info({ jobId: job.id, schedule: job.schedule }, "Cron job scheduled");
}

export async function initCronJobs() {
  const jobs = await db.select().from(cronJobsTable).where(eq(cronJobsTable.enabled, true));
  for (const job of jobs) {
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, job.toolId));
    if (tool) scheduleJob(job, tool);
  }
  logger.info({ count: jobs.length }, "Cron jobs initialized");
}

router.get("/", async (req, res) => {
  try {
    const jobs = await db.select().from(cronJobsTable).orderBy(cronJobsTable.createdAt);
    res.json(jobs.map(mapJob));
  } catch (err) {
    req.log.error({ err }, "Failed to list cron jobs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateCronJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { toolId, target, args, schedule } = parsed.data;
  if (!cron.validate(schedule)) {
    res.status(400).json({ error: "Invalid cron schedule expression" });
    return;
  }
  try {
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, toolId));
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    const [job] = await db.insert(cronJobsTable).values({
      toolId,
      toolName: tool.name,
      target,
      args: args ?? tool.defaultArgs ?? "",
      schedule,
      enabled: true,
    }).returning();
    scheduleJob(job, tool);
    res.status(201).json(mapJob(job));
  } catch (err) {
    req.log.error({ err }, "Failed to create cron job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const parsed = GetCronJobParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const [job] = await db.select().from(cronJobsTable).where(eq(cronJobsTable.id, parsed.data.id));
    if (!job) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapJob(job));
  } catch (err) {
    req.log.error({ err }, "Failed to get cron job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const paramParsed = UpdateCronJobParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const bodyParsed = UpdateCronJobBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  if (bodyParsed.data.schedule && !cron.validate(bodyParsed.data.schedule)) {
    res.status(400).json({ error: "Invalid cron schedule" }); return;
  }
  try {
    const updates: Record<string, unknown> = {};
    if (bodyParsed.data.target !== undefined) updates.target = bodyParsed.data.target;
    if (bodyParsed.data.args !== undefined) updates.args = bodyParsed.data.args;
    if (bodyParsed.data.schedule !== undefined) updates.schedule = bodyParsed.data.schedule;
    if (bodyParsed.data.enabled !== undefined) updates.enabled = bodyParsed.data.enabled;
    const [job] = await db.update(cronJobsTable).set(updates).where(eq(cronJobsTable.id, paramParsed.data.id)).returning();
    if (!job) { res.status(404).json({ error: "Not found" }); return; }
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, job.toolId));
    if (tool) scheduleJob(job, tool);
    res.json(mapJob(job));
  } catch (err) {
    req.log.error({ err }, "Failed to update cron job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteCronJobParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    if (activeJobs.has(parsed.data.id)) {
      activeJobs.get(parsed.data.id)!.stop();
      activeJobs.delete(parsed.data.id);
    }
    await db.delete(cronJobsTable).where(eq(cronJobsTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete cron job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/toggle", async (req, res) => {
  const paramParsed = ToggleCronJobParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { enabled } = req.body as { enabled: boolean };
  if (typeof enabled !== "boolean") { res.status(400).json({ error: "enabled must be boolean" }); return; }
  try {
    const [job] = await db.update(cronJobsTable).set({ enabled }).where(eq(cronJobsTable.id, paramParsed.data.id)).returning();
    if (!job) { res.status(404).json({ error: "Not found" }); return; }
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, job.toolId));
    if (tool) scheduleJob(job, tool);
    res.json(mapJob(job));
  } catch (err) {
    req.log.error({ err }, "Failed to toggle cron job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/run-now", async (req, res) => {
  const parsed = RunCronJobNowParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const [job] = await db.select().from(cronJobsTable).where(eq(cronJobsTable.id, parsed.data.id));
    if (!job) { res.status(404).json({ error: "Not found" }); return; }
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, job.toolId));
    if (!tool) { res.status(404).json({ error: "Tool not found" }); return; }
    const [scan] = await db.insert(scansTable).values({
      toolId: tool.id,
      toolName: tool.name,
      target: job.target,
      args: job.args,
      status: "pending",
    }).returning();
    res.status(201).json({
      id: scan.id,
      toolId: scan.toolId,
      toolName: scan.toolName,
      target: scan.target,
      args: scan.args,
      status: scan.status,
      output: null,
      exitCode: null,
      createdAt: scan.createdAt.toISOString(),
      completedAt: null,
      durationMs: null,
    });
    executeTool(job.id, tool.command, job.target, job.args, tool.id, tool.name).catch(e =>
      logger.error({ err: e }, "Failed to run cron job now")
    );
  } catch (err) {
    req.log.error({ err }, "Failed to run cron job now");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
