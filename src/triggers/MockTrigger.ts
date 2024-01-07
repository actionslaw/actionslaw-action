import { Item, Trigger } from "./Trigger";
import { TriggerConfig } from "./TriggerConfig";

export interface MockConfig extends TriggerConfig {
  readonly repititions?: number;
  readonly payload?: Item;
}

export class MockTrigger extends Trigger {
  private readonly config: MockConfig;

  constructor(config: MockConfig) {
    super();
    this.config = config;
  }

  async run(): Promise<Item[]> {
    const repititions = this.config.repititions ? this.config.repititions : 1;
    if (this.config.payload) {
      return new Array<Item>(repititions).fill(this.config.payload);
    } else return [];
  }
}
