import { loadRootEnv } from "./lib/env";
import { logger } from "./lib/logger";

loadRootEnv();

const rawPort = process.env["API_PORT"] ?? process.env["PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const [{ default: app }, { initCronJobs }, { syncBuiltinTools }] = await Promise.all([
  import("./app"),
  import("./routes/cron-jobs"),
  import("./lib/tool-config"),
]);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  syncBuiltinTools().catch((e) => logger.error({ err: e }, "Failed to sync builtin tools"));
  initCronJobs().catch((e) => logger.error({ err: e }, "Failed to initialize cron jobs"));
});
