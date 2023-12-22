import * as core from "@actions/core";
import { Item } from "./triggers/Trigger";
import { Triggers } from "./triggers/Triggers";

export class ActionslawAction {
  async run(): Promise<void> {
    const config = Object.entries<[string, string][]>(
      JSON.parse(core.getInput("on", { required: true })),
    );

    const triggerKeys = config.map((entry) => entry[0]);
    core.info(`🔫 running actionslaw [${triggerKeys}] triggers`);

    const triggers = config.map((entry) => {
      const [triggerKey, triggerConfig] = entry;
      return Triggers.for(triggerKey)!(triggerConfig);
    });

    const items: Item[][] = await Promise.all(
      triggers.map(async (trigger) => await trigger.run()),
    );

    console.debug(`🔫 triggering [${items.flat().map((item) => item.key)}]`);

    core.setOutput("items", JSON.stringify(items.flat()));
  }
}
