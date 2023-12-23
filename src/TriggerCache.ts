import { Key } from "./triggers/Trigger";
import * as cache from "@actions/cache";
import * as fs from "fs";
import * as fsExtra from "fs-extra";

export class TriggerCache {
  static readonly file: string = "actionslaw.cache.json";

  static async isCached(key: Key): Promise<boolean> {
    console.debug(`🗺️  Checking trigger cache [${key}:${TriggerCache.file}]`);
    await cache.restoreCache([TriggerCache.file], key);
    return await fsExtra.pathExists(TriggerCache.file);
  }

  static async save(tocache: Key[]): Promise<void> {
    tocache.forEach(async (key: Key) => {
      console.debug(`🗺️  Cache trigger [${key}:${TriggerCache.file}]`);
      await fs.promises.writeFile(TriggerCache.file, key);
      await cache.saveCache([TriggerCache.file], key);
    });
  }
}
