export type Key = string & { readonly "": unique symbol };

export interface Item {
  readonly key: Key;
  readonly published: Date;
}

export abstract class Trigger {
  abstract run(): Promise<Item[]>;
}
