import { Item, Key } from "../Trigger";

export class Post implements Item {
  uri: string;
  message: string;
  replyto?: string;
  media?: String;

  constructor(uri: string, message: string, replyto?: string, media?: string) {
    this.uri = uri;
    this.message = message;
    this.replyto = replyto;
    this.media = media;
  }

  get key(): Key {
    return this.uri as Key;
  }
}
