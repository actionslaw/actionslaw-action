import { Item, Trigger } from "./Trigger";
import Parser from "rss-parser";

interface RssConfig {
  readonly url?: string;
}

class RssItem implements Item, Parser.Item {
  readonly key: string;
  readonly link?: string;
  readonly guid?: string;
  readonly title?: string;
  readonly pubDate?: string;
  readonly creator?: string;
  readonly summary?: string;
  readonly content?: string;
  readonly isoDate?: string;
  readonly categories?: string[];
  readonly contentSnippet?: string;
  readonly enclosure?: Parser.Enclosure;

  constructor(item: Parser.Item) {
    if (item.guid) this.key = item.guid;
    else if (item.link) this.key = item.link;
    else this.key = "digest";
    // this.key = this.helpers.createContentDigest(item);

    this.link = item.link;
    this.guid = item.guid;
    this.title = item.title;
    this.pubDate = item.pubDate;
    this.creator = item.creator;
    this.summary = item.summary;
    this.content = item.content;
    this.isoDate = item.isoDate;
    this.categories = item.categories;
    this.contentSnippet = item.contentSnippet;
    this.enclosure = item.enclosure;
  }
}

export class RssTrigger extends Trigger {
  private readonly config: RssConfig;
  private readonly parser: Parser = new Parser();

  constructor(config: [string, string][]) {
    super();
    this.config = config as RssConfig;
  }

  async run(): Promise<Item[]> {
    if (this.config.url) {
      const feed = await this.parser.parseURL(this.config.url);
      return feed.items.map((item) => new RssItem(item));
    }
    return [];
  }
}
