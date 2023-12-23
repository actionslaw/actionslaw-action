import * as core from "@actions/core";
import { Key, Item } from "./triggers/Trigger";
import { TriggerKey, Triggers } from "./triggers/Triggers";
import { TriggerCache } from "./TriggerCache";
import { Config } from "./Config";

export class ActionslawAction {
  async run(): Promise<void> {
    const config: [TriggerKey, Config][] = Object.entries<Config>(
      JSON.parse(core.getInput("on", { required: true })),
    ) as [TriggerKey, Config][];

    const triggerKeys: TriggerKey[] = config.map((entry) => entry[0]);
    core.info(`🔫 running actionslaw [${triggerKeys}] triggers`);

    const triggers = config.map((entry) => {
      const [triggerKey, triggerConfig] = entry;
      return Triggers.for(triggerKey)!(triggerConfig);
    });

    const items: Item[][] = await Promise.all(
      triggers.map(async (trigger) => await trigger.run()),
    );

    const keys: Key[] = items.flat().map((item) => item.key);

    console.debug(`🔫 found [${keys}] triggers`);

    const uncached: Item[] = items
      .flat()
      .filter(async (item) => await !TriggerCache.isCached(item.key));

    console.debug(`🔫 triggering [${uncached.flat().map((item) => item.key)}]`);

    core.setOutput("items", JSON.stringify(uncached.flat()));

    await TriggerCache.save(uncached.map((item) => item.key));
  }
}
