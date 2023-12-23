import { Key } from "./triggers/Trigger";
import * as cache from "@actions/cache";
import * as github from "@actions/github";
import * as fs from "fs";
import * as fsExtra from "fs-extra";

export class TriggerCache {
  static readonly key: string = github.context.workflow
    ? github.context.workflow
    : "test-key";

  static readonly file: string = "actionslaw.cache.json";

  static async load(): Promise<Key[]> {
    console.debug(
      `🗺️ Loading trigger cache [${TriggerCache.key}:${TriggerCache.file}]`,
    );
    const exists = await fsExtra.pathExists(TriggerCache.file);
    if (exists) {
      await cache.restoreCache([TriggerCache.file], TriggerCache.key);
      const raw = await fs.promises.readFile(TriggerCache.file, "utf8");
      return JSON.parse(raw) as Key[];
    } else return [];
  }

  static async save(tocache: Key[]): Promise<void> {
    console.debug(
      `🗺️ Saving trigger cache [${TriggerCache.key}:${TriggerCache.file}]`,
    );
    await fs.promises.writeFile(TriggerCache.file, JSON.stringify(tocache));
    await cache.saveCache([TriggerCache.file], TriggerCache.key);
  }
}
