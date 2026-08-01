import { fileURLToPath } from "node:url";

import { createServerLogger } from "./logging/index.ts";
import { createLanServer } from "./server/create-lan-server.ts";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const logDirectory = fileURLToPath(new URL("../../../logs/", import.meta.url));

const logger = await createServerLogger({ directory: logDirectory });
const lanServer = createLanServer({ clientOrigin });
let shuttingDown = false;

lanServer.httpServer.listen(port, host, () => {
  logger.info({
    action: "System",
    module: "ServerBootstrap",
    message: `Game server started at http://${host}:${port}.`,
    context: { host, port, clientOrigin },
  });
});

lanServer.httpServer.once("error", (error) => {
  const errorCode = (error as NodeJS.ErrnoException).code ?? "UNKNOWN";
  logger.error({
    action: "System",
    module: "ServerBootstrap",
    message: `Game server encountered HTTP error ${errorCode}.`,
    context: { errorCode, errorName: error.name, errorMessage: error.message },
  });
  process.exitCode = 1;
  void logger.close();
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.info({
    action: "System",
    module: "ServerBootstrap",
    message: `Game server received ${signal} and started shutting down.`,
    context: { signal },
  });

  await new Promise<void>((resolve) => {
    lanServer.socketServer.close(() => resolve());
  });

  logger.info({
    action: "System",
    module: "ServerBootstrap",
    message: "Game server stopped successfully.",
  });
  await logger.close();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
