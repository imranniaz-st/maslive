import { Router } from "express";
import { db, toolsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateToolBody,
  UpdateToolBody,
  GetToolParams,
  UpdateToolParams,
  DeleteToolParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const tools = await db.select().from(toolsTable).orderBy(toolsTable.name);
    const mapped = tools.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      command: t.command,
      defaultArgs: t.defaultArgs ?? null,
      isBuiltin: t.isBuiltin,
      createdAt: t.createdAt.toISOString(),
    }));
    res.json(mapped);
  } catch (err) {
    req.log.error({ err }, "Failed to list tools");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateToolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, description, category, command, defaultArgs } = parsed.data;
  try {
    const [tool] = await db
      .insert(toolsTable)
      .values({ name, description, category, command, defaultArgs: defaultArgs ?? null, isBuiltin: false })
      .returning();
    res.status(201).json({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      command: tool.command,
      defaultArgs: tool.defaultArgs ?? null,
      isBuiltin: tool.isBuiltin,
      createdAt: tool.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create tool");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const parsed = GetToolParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, parsed.data.id));
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    res.json({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      command: tool.command,
      defaultArgs: tool.defaultArgs ?? null,
      isBuiltin: tool.isBuiltin,
      createdAt: tool.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get tool");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const paramParsed = UpdateToolParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const bodyParsed = UpdateToolBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const updates: Record<string, unknown> = {};
    if (bodyParsed.data.name !== undefined) updates.name = bodyParsed.data.name;
    if (bodyParsed.data.description !== undefined) updates.description = bodyParsed.data.description;
    if (bodyParsed.data.category !== undefined) updates.category = bodyParsed.data.category;
    if (bodyParsed.data.command !== undefined) updates.command = bodyParsed.data.command;
    if (bodyParsed.data.defaultArgs !== undefined) updates.defaultArgs = bodyParsed.data.defaultArgs;

    const [tool] = await db
      .update(toolsTable)
      .set(updates)
      .where(eq(toolsTable.id, paramParsed.data.id))
      .returning();
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    res.json({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      command: tool.command,
      defaultArgs: tool.defaultArgs ?? null,
      isBuiltin: tool.isBuiltin,
      createdAt: tool.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update tool");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteToolParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    await db.delete(toolsTable).where(eq(toolsTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete tool");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
