import { Item, Trigger } from "./Trigger";
import { Config } from "../Config";

interface MockConfig {
  readonly repititions?: number;
  readonly payload?: Item;
}

export class MockTrigger extends Trigger {
  private readonly config: MockConfig;

  constructor(config: Config) {
    super();
    this.config = config as MockConfig;
  }

  async run(): Promise<Item[]> {
    const repititions = this.config.repititions ? this.config.repititions : 1;
    if (this.config.payload) {
      return new Array<Item>(repititions).fill(this.config.payload);
    } else return [];
  }
}
