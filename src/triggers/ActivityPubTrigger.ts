import { Item, Key, Trigger } from "../Trigger";
import { TriggerConfig } from "../TriggerConfig";
import generator, { Entity } from "megalodon";
import { htmlToText } from "html-to-text";
import * as core from "@actions/core";

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

type Status = Entity.Status;
type Account = Entity.Account;

type Minutes = number;

export interface ActivityPubConfig extends TriggerConfig {
  readonly host?: string;
  readonly id?: string;
  readonly cutoff?: Minutes;
  readonly protocol?: string;
  readonly removeTrailingHashtags?: boolean;
}
const defaultCutoff: Minutes = 30;
const defaultProtocol = "https";

function findParentReplies(
  source: Status,
  outbox: Status[],
  accumulator: Status[] = [],
  depth: number = 5,
): Status[] {
  const parent = outbox.filter((post) => post.id === source.in_reply_to_id)[0];

  if (parent && depth > 1)
    return findParentReplies(
      parent,
      outbox,
      accumulator.concat([parent]),
      depth - 1,
    );
  else return accumulator;
}

type StatusFilter = (status: Status) => boolean;

function directRepliesFor(account: Account, outbox: Status[]): StatusFilter {
  return (status: Status) => {
    const reply = status.in_reply_to_id;
    const isAccountOwnerReply = reply ? reply.startsWith(account.id) : false;

    const isIndirectReply = findParentReplies(status, outbox).some(
      (reply) =>
        reply.in_reply_to_id && !reply.in_reply_to_id.startsWith(account.id),
    );

    return !reply || (isAccountOwnerReply && !isIndirectReply);
  };
}

export class ActivityPubTrigger implements Trigger {
  private readonly config: ActivityPubConfig;

  constructor(config: ActivityPubConfig) {
    this.config = config;
  }

  async run(): Promise<Post[]> {
    if (!this.config.host || !this.config.id) {
      throw new Error(
        `Required config for user [${this.config.id}] or host [${this.config.host}] missing`,
      );
    }

    const protocol = this.config.protocol
      ? this.config.protocol
      : defaultProtocol;

    core.info(
      `🔫 retrieving activitypub notes for @${this.config.id}@${this.config.host}`,
    );

    const client = await generator(
      "mastodon",
      `${protocol}://${this.config.host}`,
    );
    const account = await client.getAccount(this.config.id);
    const statuses = await client.getAccountStatuses(this.config.id);

    const cutoffPeriod: Minutes = this.config.cutoff
      ? this.config.cutoff
      : defaultCutoff;

    const cutoff = new Date(Date.now());
    const adjustment = cutoff.getMinutes() - cutoffPeriod;
    cutoff.setMinutes(adjustment);

    const notes = statuses.data
      .filter((status) => status.content)
      .filter((status) => new Date(status.created_at) > cutoff)
      .filter(directRepliesFor(account.data, statuses.data));

    const posts = notes!.map(async (status) => {
      const text = htmlToText(status.content, {
        wordwrap: false,
        tags: {
          a: {
            options: {
              ignoreHref: true,
            },
          },
        },
      });

      const stripHashTags = (t: string) =>
        t.replaceAll(/(?:\s*[#$][a-z\d-]+)+$/gi, "");

      const filteredText = this.config.removeTrailingHashtags
        ? stripHashTags(text)
        : text;

      const media = status.media_attachments.map((status) => status.url);

      return new Post(
        status.id,
        filteredText,
        new Date(status.created_at),
        status.in_reply_to_id ? status.in_reply_to_id : undefined,
        media,
      );
    });

    return Promise.all(posts);
  }
}
