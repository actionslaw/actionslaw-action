import * as core from "@actions/core";
import { Key, Item } from "./triggers/Trigger";
import { TriggerKey, Triggers } from "./triggers/Triggers";
import { TriggerCache } from "./TriggerCache";
import { Config } from "./Config";

export class ActionslawAction {
  async run(): Promise<void> {
    const config = Object.entries<Config>(
      JSON.parse(core.getInput("on", { required: true })),
    ) as [TriggerKey, Config][];

    const triggerKeys = config.map((entry) => entry[0]);
    core.info(`🔫 running actionslaw [${triggerKeys}] triggers`);

    const triggers = config.map((entry) => {
      const [triggerKey, triggerConfig] = entry;
      return Triggers.for(triggerKey)!(triggerConfig);
    });

    const items: Item[][] = await Promise.all(
      triggers.map(async (trigger) => await trigger.run()),
    );
    const allItems = items.flat();

    const keys: Key[] = allItems.map((item) => item.key);

    console.debug(`🔫 found [${keys}] triggers`);

    const cacheChecks: boolean[] = await Promise.all(
      allItems.map((item) => TriggerCache.isCached(item.key)),
    );

    const uncached: Item[] =
      cacheChecks
        .map<[boolean, Item]>((check, i) => [check, allItems[i]])
        .filter(([cached, _]) => !cached)
        .map<Item>(([_, item]) => item)

    console.debug(`🔫 triggering [${uncached.flat().map((item) => item.key)}]`);

    core.setOutput("items", JSON.stringify(uncached.flat()));

    await TriggerCache.save(uncached.map((item) => item.key));
  }
}
