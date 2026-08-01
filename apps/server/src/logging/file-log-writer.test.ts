import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FileLogWriter } from "./file-log-writer.ts";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "genesis-rift-log-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("FileLogWriter", () => {
  it("writes to latest.log and archives it on close", async () => {
    const directory = await createTemporaryDirectory();
    const createdAt = new Date(2026, 7, 1, 12, 30, 15, 21).getTime();
    const writer = await FileLogWriter.create({ directory, now: () => createdAt });

    await writer.write("First entry.");
    expect(await readFile(path.join(directory, "latest.log"), "utf-8")).toBe("First entry.\n");

    await writer.close();

    expect(await readdir(directory)).toEqual(["game_20260801_123015_021.log"]);
    expect(await readFile(path.join(directory, "game_20260801_123015_021.log"), "utf-8")).toBe(
      "First entry.\n",
    );
  });

  it("rotates before an entry would exceed the configured byte limit", async () => {
    const directory = await createTemporaryDirectory();
    const firstCreatedAt = new Date(2026, 7, 1, 12, 30, 15, 21).getTime();
    const secondCreatedAt = firstCreatedAt + 1;
    const times = [firstCreatedAt, secondCreatedAt];
    const writer = await FileLogWriter.create({
      directory,
      maxFileSizeBytes: 12,
      now: () => times.shift() ?? secondCreatedAt,
    });

    await writer.write("First");
    await writer.write("Second");

    expect(await readFile(path.join(directory, "latest.log"), "utf-8")).toBe("Second\n");
    expect(await readFile(path.join(directory, "game_20260801_123015_021.log"), "utf-8")).toBe(
      "First\n",
    );

    await writer.close();
    expect((await readdir(directory)).sort()).toEqual([
      "game_20260801_123015_021.log",
      "game_20260801_123015_022.log",
    ]);
  });

  it("archives a non-empty latest.log left by a previous process", async () => {
    const directory = await createTemporaryDirectory();
    await writeFile(path.join(directory, "latest.log"), "Previous run.\n", "utf-8");

    const writer = await FileLogWriter.create({ directory, now: () => Date.now() });
    const files = await readdir(directory);

    expect(files).toContain("latest.log");
    expect(files.some((file) => /^game_\d{8}_\d{6}_\d{3}\.log$/u.test(file))).toBe(true);

    await writer.close();
  });

  it("rejects a single entry larger than the file limit without splitting it", async () => {
    const directory = await createTemporaryDirectory();
    const writer = await FileLogWriter.create({ directory, maxFileSizeBytes: 5 });

    await expect(writer.write("12345")).rejects.toThrow(RangeError);
    await writer.close();
  });
});
