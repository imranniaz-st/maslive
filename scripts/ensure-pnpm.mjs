import { rm } from "node:fs/promises";

await Promise.all([
  rm("package-lock.json", { force: true }),
  rm("yarn.lock", { force: true }),
]);

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead of npm or yarn.");
  console.error("On Windows, run: corepack enable; corepack prepare pnpm@latest --activate");
  process.exit(1);
}
