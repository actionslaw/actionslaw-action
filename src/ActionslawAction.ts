import * as core from "@actions/core";
import { Key, Item } from "./triggers/Trigger";
import { TriggerKey, Triggers } from "./triggers/Triggers";
import { TriggerCache } from "./TriggerCache";
import { TriggerConfig } from "./triggers/TriggerConfig";

interface Config {
  triggers: [TriggerKey, TriggerConfig][];
  cache: boolean;
}

export class ActionslawAction {
  async run(): Promise<void> {
    const config: Config = {
      triggers: Object.entries<TriggerConfig>(
        JSON.parse(core.getInput("on", { required: true })),
      ) as [TriggerKey, TriggerConfig][],
      cache: core.getInput("cache") !== "false",
    };

    const triggerKeys = config.triggers.map((entry) => entry[0]);
    core.info(`🔫 running actionslaw [${triggerKeys}] triggers`);

    const triggers = config.triggers.map((entry) => {
      const [triggerKey, triggerConfig] = entry;
      return Triggers.for(triggerKey)!(triggerConfig);
    });

    const items: Item[][] = await Promise.all(
      triggers.map(async (trigger) => await trigger.run()),
    );
    const allItems = items.flat();

    const keys: Key[] = allItems.map((item) => item.key);

    core.debug(`🔫 found [${keys}] triggers`);

    const checkCaches = () =>
      Promise.all(allItems.map((item) => TriggerCache.isCached(item.key)));

    const ignoreCache = Array<boolean>(allItems.length).fill(false);

    const checks: boolean[] = config.cache ? await checkCaches() : ignoreCache;

    const uncached: Item[] = checks
      .map<[boolean, Item]>((check, i) => [check, allItems[i]])
      .filter(([cached, _]) => !cached)
      .map<Item>(([_, item]) => item);

    core.debug(`🔫 triggering [${uncached.map((item) => item.key)}]`);

    core.setOutput("items", JSON.stringify(uncached));

    if (config.cache) await TriggerCache.save(uncached.map((item) => item.key));
  }
}
