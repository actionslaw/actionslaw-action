import { MockTrigger } from "./MockTrigger";
import { RssTrigger } from "./RssTrigger";
import { Trigger } from "./Trigger";
import { ActivityPubTrigger } from "./activitypub/ActivityPubTrigger";

export type TriggerKey = string;

type TriggerFactory = (config: [string, string][]) => Trigger;

export abstract class Triggers {
  static for(key: TriggerKey): TriggerFactory | undefined {
    switch (key) {
      case "activitypub":
        return (config: [string, string][]) => new ActivityPubTrigger(config);
      case "rss":
        return (config: [string, string][]) => new RssTrigger(config);
      case "mock":
        return (config: [string, string][]) => new MockTrigger(config);
      default:
        throw new Error(`No trigger found for key ${key}`);
    }
  }
}
