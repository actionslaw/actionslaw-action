import { Item, Key } from "../Trigger";

export class Post implements Item {
  uri: string;
  message: string;
  replyto?: string;

  constructor(uri: string, message: string, replyto?: string) {
    this.uri = uri;
    this.message = message;
    this.replyto = replyto;
  }

  get key(): Key {
    return this.uri as Key;
  }
}
