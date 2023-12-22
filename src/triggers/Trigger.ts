export interface Item {
  readonly key: string;
}

export abstract class Trigger {
  abstract run(): Promise<Item[]>;
}
