import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = await buildApp(config);
const shutdown = async (signal: string) => {
  app.log.info({ signal }, "graceful shutdown");
  await app.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  app.log.error({ reason }, "unhandled rejection");
});
await app.listen({ host: config.HOST, port: config.PORT });
