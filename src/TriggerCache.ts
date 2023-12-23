import { Key } from "./triggers/Trigger";
import * as cache from "@actions/cache";
import * as fs from "fs";

export class TriggerCache {
  private static readonly file: string = "./actionslaw.cache.json";

  static async isCached(key: Key): Promise<boolean> {
    const cacheId = await cache.restoreCache([TriggerCache.file], key);
    const cached = cacheId !== undefined
    console.debug(`🗺️  Check trigger cache [${key}:${TriggerCache.file}]=${cached}`);
    return cached;
  }

  static async save(tocache: Key[]): Promise<void> {
    tocache.forEach(async (key: Key) => {
      console.debug(`🗺️  Cache trigger [${key}:${TriggerCache.file}]`);
      await fs.promises.writeFile(TriggerCache.file, key);
      await cache.saveCache([TriggerCache.file], key);
    });
  }
}
