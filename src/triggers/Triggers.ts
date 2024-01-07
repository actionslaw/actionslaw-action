import { MockConfig, MockTrigger } from "./MockTrigger";
import { RssConfig, RssTrigger } from "./RssTrigger";
import { Trigger } from "./Trigger";
import {
  ActivityPubConfig,
  ActivityPubTrigger,
} from "./activitypub/ActivityPubTrigger";
import { TriggerConfig } from "./TriggerConfig";

export type TriggerKey = string & { readonly "": unique symbol };

type TriggerFactory = (config: TriggerConfig) => Trigger;

export abstract class Triggers {
  static for(key: TriggerKey): TriggerFactory {
    switch (key) {
      case "activitypub":
        return (config: TriggerConfig) =>
          new ActivityPubTrigger(config as ActivityPubConfig);
      case "rss":
        return (config: TriggerConfig) => new RssTrigger(config as RssConfig);
      case "mock":
        return (config: TriggerConfig) => new MockTrigger(config as MockConfig);
      default:
        throw new Error(`No trigger found for key ${key}`);
    }
  }
}
