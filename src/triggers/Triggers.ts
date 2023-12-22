import { RssTrigger } from "./RssTrigger";
import { Trigger } from "./Trigger";

export type TriggerKey = string;

type TriggerFactory = (config: [string, string][]) => Trigger;

export abstract class Triggers {
  static for(key: TriggerKey): TriggerFactory | undefined {
    switch (key) {
      case "rss":
        return (config: [string, string][]) => new RssTrigger(config);
      default:
        throw new Error(`No trigger found for key ${key}`)
    }
  }
}
