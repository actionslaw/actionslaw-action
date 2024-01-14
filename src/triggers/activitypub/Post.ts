import { Item, Key } from "../Trigger";

export class Post implements Item {
  readonly uri: string;
  readonly message: string;
  readonly replyto?: string;
  readonly downloads?: string[];
  readonly published: Date;

  constructor(
    uri: string,
    message: string,
    published: Date,
    replyto?: string,
    downloads?: string[],
  ) {
    this.uri = uri;
    this.message = message;
    this.replyto = replyto;
    this.downloads = downloads;
    this.published = published;
  }

  get key(): Key {
    return this.uri as Key;
  }
}
