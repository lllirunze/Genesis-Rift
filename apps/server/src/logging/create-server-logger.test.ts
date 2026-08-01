import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createServerLogger } from "./create-server-logger.ts";

describe("createServerLogger", () => {
  it("falls back to a no-op logger when the log directory cannot be created", async () => {
    const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "genesis-rift-log-init-"));
    const blockingFile = path.join(temporaryDirectory, "blocking-file");
    await writeFile(blockingFile, "not a directory", "utf-8");
    const failures: string[] = [];

    try {
      const logger = await createServerLogger({
        directory: path.join(blockingFile, "logs"),
        fallback: (message) => failures.push(message),
      });

      expect(() =>
        logger.info({
          action: "System",
          module: "GameServer",
          message: "Game continued without file logging.",
        }),
      ).not.toThrow();
      await logger.close();

      expect(failures).toEqual(["Failed to create log directory."]);
    } finally {
      await rm(temporaryDirectory, { recursive: true });
    }
  });
});
