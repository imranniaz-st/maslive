import { Router } from "express";
import { db, scansTable, toolsTable } from "@workspace/db";
import { eq, and, desc, isNull } from "drizzle-orm";
import { spawn } from "child_process";
import {
  CreateScanBody,
  GetScanParams,
  DeleteScanParams,
  ListScansQueryParams,
} from "@workspace/api-zod";

const router = Router();

function mapScan(scan: typeof scansTable.$inferSelect) {
  return {
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
  };
}

router.get("/", async (req, res) => {
  const parsed = ListScansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  try {
    const conditions = [];
    if (parsed.data.toolId != null) {
      conditions.push(eq(scansTable.toolId, parsed.data.toolId));
    }
    if (parsed.data.status != null) {
      conditions.push(eq(scansTable.status, parsed.data.status));
    }
    const scans = await db
      .select()
      .from(scansTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(scansTable.createdAt));
    res.json(scans.map(mapScan));
  } catch (err) {
    req.log.error({ err }, "Failed to list scans");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { toolId, target, args } = parsed.data;
  try {
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, toolId));
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    const [scan] = await db
      .insert(scansTable)
      .values({
        toolId,
        toolName: tool.name,
        target,
        args: args ?? tool.defaultArgs ?? "",
        status: "pending",
      })
      .returning();
    res.status(201).json(mapScan(scan));

    runScanAsync(scan.id, tool.command, target, args ?? tool.defaultArgs ?? "");
  } catch (err) {
    req.log.error({ err }, "Failed to create scan");
    res.status(500).json({ error: "Internal server error" });
  }
});

async function runScanAsync(scanId: number, command: string, target: string, args: string) {
  await db.update(scansTable).set({ status: "running" }).where(eq(scansTable.id, scanId));

  const startTime = Date.now();
  const parts = [command, ...args.split(" ").filter(Boolean), target].filter(Boolean);
  const cmd = parts[0];
  const cmdArgs = parts.slice(1);

  const outputChunks: string[] = [];

  try {
    await new Promise<void>((resolve) => {
      const proc = spawn(cmd, cmdArgs, { timeout: 60000 });

      proc.stdout.on("data", (data: Buffer) => {
        outputChunks.push(data.toString());
      });
      proc.stderr.on("data", (data: Buffer) => {
        outputChunks.push(data.toString());
      });

      proc.on("close", async (code) => {
        const durationMs = Date.now() - startTime;
        const output = outputChunks.join("");
        await db
          .update(scansTable)
          .set({
            status: code === 0 ? "completed" : "failed",
            output,
            exitCode: code ?? -1,
            durationMs,
            completedAt: new Date(),
          })
          .where(eq(scansTable.id, scanId));
        resolve();
      });

      proc.on("error", async (err) => {
        const durationMs = Date.now() - startTime;
        const errorOutput = outputChunks.join("") + `\nError: ${(err as Error).message}`;
        await db
          .update(scansTable)
          .set({
            status: "failed",
            output: errorOutput,
            exitCode: -1,
            durationMs,
            completedAt: new Date(),
          })
          .where(eq(scansTable.id, scanId));
        resolve();
      });
    });
  } catch {
    await db
      .update(scansTable)
      .set({
        status: "failed",
        output: "Scan timed out or failed to start.",
        exitCode: -1,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      })
      .where(eq(scansTable.id, scanId));
  }
}

router.get("/:id", async (req, res) => {
  const parsed = GetScanParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, parsed.data.id));
    if (!scan) {
      res.status(404).json({ error: "Scan not found" });
      return;
    }
    res.json(mapScan(scan));
  } catch (err) {
    req.log.error({ err }, "Failed to get scan");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteScanParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    await db.delete(scansTable).where(eq(scansTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete scan");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
