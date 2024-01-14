import { Item, Key } from "../Trigger";

export class Post implements Item {
  readonly uri: string;
  readonly message: string;
  readonly replyto?: string;
  readonly media?: string[];
  readonly published: Date;

  constructor(
    uri: string,
    message: string,
    published: Date,
    replyto?: string,
    media?: string[],
  ) {
    this.uri = uri;
    this.message = message;
    this.replyto = replyto;
    this.media = media;
    this.published = published;
  }

  get key(): Key {
    return this.uri as Key;
  }
}
