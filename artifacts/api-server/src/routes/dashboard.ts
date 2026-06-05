import { Router } from "express";
import { db, scansTable, toolsTable } from "@workspace/db";
import { eq, count, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const [toolStats] = await db
      .select({
        total: count(),
        builtin: sql<number>`count(*) filter (where ${toolsTable.isBuiltin} = true)`,
      })
      .from(toolsTable);

    const [scanStats] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${scansTable.status} in ('pending','running'))`,
        completed: sql<number>`count(*) filter (where ${scansTable.status} = 'completed')`,
        failed: sql<number>`count(*) filter (where ${scansTable.status} = 'failed')`,
      })
      .from(scansTable);

    const totalTools = Number(toolStats?.total ?? 0);
    const builtinTools = Number(toolStats?.builtin ?? 0);

    res.json({
      totalScans: Number(scanStats?.total ?? 0),
      activeScans: Number(scanStats?.active ?? 0),
      completedScans: Number(scanStats?.completed ?? 0),
      failedScans: Number(scanStats?.failed ?? 0),
      totalTools,
      builtinTools,
      customTools: totalTools - builtinTools,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/recent-scans", async (req, res) => {
  try {
    const scans = await db
      .select()
      .from(scansTable)
      .orderBy(desc(scansTable.createdAt))
      .limit(10);
    res.json(
      scans.map((scan) => ({
        id: scan.id,
        toolId: scan.toolId,
        toolName: scan.toolName,
        target: scan.target,
        args: scan.args,
        status: scan.status,
        output: scan.output ?? null,
        exitCode: scan.exitCode ?? null,
        createdAt: scan.createdAt.toISOString(),
        completedAt: scan.completedAt ? scan.completedAt.toISOString() : null,
        durationMs: scan.durationMs ?? null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get recent scans");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tool-usage", async (req, res) => {
  try {
    const usage = await db
      .select({
        toolName: scansTable.toolName,
        count: count(),
      })
      .from(scansTable)
      .groupBy(scansTable.toolName)
      .orderBy(desc(count()))
      .limit(10);

    const toolList = await db.select().from(toolsTable);
    const categoryMap = new Map(toolList.map((t) => [t.name, t.category]));

    res.json(
      usage.map((u) => ({
        toolName: u.toolName,
        category: categoryMap.get(u.toolName) ?? "custom",
        count: Number(u.count),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get tool usage");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
