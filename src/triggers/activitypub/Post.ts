import { Item } from "../Trigger";

export class Post implements Item {
  uri: string;
  message: string;

  constructor(uri: string, message: string) {
    this.uri = uri;
    this.message = message;
  }

  get key() {
    return this.uri;
  }
}
