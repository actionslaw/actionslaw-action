export type Key = string & { readonly "": unique symbol };

export interface Attachment {
  url: string;
  alt: string | null;
}

export interface Item {
  readonly key: Key;
  readonly published: Date;
  readonly media?: Attachment[];
}

export abstract class Trigger {
  abstract run(): Promise<Item[]>;
}
