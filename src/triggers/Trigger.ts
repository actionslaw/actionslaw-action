export type Key = string & { readonly "": unique symbol };

export interface Item {
  readonly key: Key;
  readonly published: Date;
  readonly media?: string[];
}

export abstract class Trigger {
  abstract run(): Promise<Item[]>;
}
