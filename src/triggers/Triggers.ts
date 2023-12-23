import { MockTrigger } from "./MockTrigger";
import { RssTrigger } from "./RssTrigger";
import { Trigger } from "./Trigger";
import { ActivityPubTrigger } from "./activitypub/ActivityPubTrigger";
import { Config } from "../Config";

export type TriggerKey = string & { readonly "": unique symbol };

type TriggerFactory = (config: Config) => Trigger;

export abstract class Triggers {
  static for(key: TriggerKey): TriggerFactory {
    switch (key) {
      case "activitypub":
        return (config: Config) => new ActivityPubTrigger(config);
      case "rss":
        return (config: Config) => new RssTrigger(config);
      case "mock":
        return (config: Config) => new MockTrigger(config);
      default:
        throw new Error(`No trigger found for key ${key}`);
    }
  }
}
