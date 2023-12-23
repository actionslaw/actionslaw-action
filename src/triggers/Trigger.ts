export type Key = string & { readonly "": unique symbol };

export interface Item {
  readonly key: Key;
}

export abstract class Trigger {
  abstract run(): Promise<Item[]>;
}
