import { Item, Key, Trigger } from "./Trigger";
import Parser from "rss-parser";
import { createHash } from "crypto";
import { TriggerConfig } from "./TriggerConfig";

export interface RssConfig extends TriggerConfig {
  readonly url?: string;
}

class RssItem implements Item, Parser.Item {
  get key(): Key {
    if (this.guid) return this.guid as Key;
    else if (this.link) return this.link as Key;
    else
      return createHash("sha1")
        .update(JSON.stringify(this))
        .digest("hex") as Key;
  }

  readonly link?: string;
  readonly guid?: string;
  readonly title?: string;
  readonly pubDate?: string;
  readonly creator?: string;
  readonly summary?: string;
  readonly isoDate?: string;
  readonly categories?: string[];
  readonly contentSnippet?: string;
  readonly enclosure?: Parser.Enclosure;
  readonly published: Date;

  constructor(item: Parser.Item) {
    this.link = item.link;
    this.guid = item.guid;
    this.title = item.title;
    this.pubDate = item.pubDate;
    this.creator = item.creator;
    this.summary = item.summary;
    this.isoDate = item.isoDate;
    this.categories = item.categories;
    this.contentSnippet = item.contentSnippet;
    this.enclosure = item.enclosure;
    this.published = item.pubDate
      ? new Date(Date.parse(item.pubDate))
      : new Date();
  }
}

export class RssTrigger extends Trigger {
  private readonly config: RssConfig;
  private readonly parser: Parser = new Parser();

  constructor(config: RssConfig) {
    super();
    this.config = config;
  }

  async run(): Promise<Item[]> {
    if (this.config.url) {
      const feed = await this.parser.parseURL(this.config.url);
      return feed.items.map((item) => new RssItem(item));
    }
    return [];
  }
}
