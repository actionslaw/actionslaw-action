import { Item, Key } from "../Trigger";

export class Post implements Item {
  uri: Key;
  message: string;

  constructor(uri: string, message: string) {
    this.uri = uri as Key;
    this.message = message;
  }

  get key(): Key {
    return this.uri;
  }
}
