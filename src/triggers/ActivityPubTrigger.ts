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
export interface ActivityPubConfig extends TriggerConfig {
  readonly host?: string;
  readonly user?: string;
  readonly cutoff?: number;
  readonly protocol?: string;
  readonly removeTrailingHashtags?: boolean;
}

type Minutes = number;
const defaultCutoff: Minutes = 30;
const defaultProtocol = "https";

function findParentReplies(
  source: Entity.Status,
  outbox: Entity.Status[],
  accumulator: Entity.Status[] = [],
  depth: number = 5,
): Entity.Status[] {
  const parent = outbox.filter(
    (status) => status.id === source.in_reply_to_id,
  )[0];

  if (parent && depth > 1)
    return findParentReplies(
      parent,
      outbox,
      accumulator.concat([parent]),
      depth - 1,
    );
  else return accumulator;
}

const directRepliesOnlyFor: (account: Entity.Account, outbox: Entity.Status[]) => (Status: Entity.Status) => boolean =
  (account: Entity.Account, outbox: Entity.Status[]) => (status: Entity.Status) =>
    !status.in_reply_to_id ||
    (status.in_reply_to_id.startsWith(account.id) &&
      !findParentReplies(status, outbox).some(
        (reply) =>
          reply.in_reply_to_id &&
          !reply.in_reply_to_id.startsWith(account.id),
      ));

export class ActivityPubTrigger implements Trigger {
  private readonly config: ActivityPubConfig;

  constructor(config: ActivityPubConfig) {
    this.config = config;
  }

  async run(): Promise<Post[]> {
    if (!this.config.host || !this.config.user) {
      throw new Error(
        `Required config for user [${this.config.user}] or host [${this.config.host}] missing`,
      );
    }

    const protocol = this.config.protocol
      ? this.config.protocol
      : defaultProtocol;

    core.info(
      `🔫 retrieving activitypub notes for @${this.config.user}@${this.config.host}`,
    );

    const client = await generator("mastodon", `${protocol}://${this.config.host}`);
    const account = await client.getAccount(this.config.user);
    const statuses = await client.getAccountStatuses(account.data.id);

    const cutoffPeriod: number = this.config.cutoff
      ? this.config.cutoff
      : defaultCutoff;

    const cutoff = new Date(Date.now());
    const adjustment = cutoff.getMinutes() - cutoffPeriod;
    cutoff.setMinutes(adjustment);

    const notes = statuses.data
      .filter((status) => new Date(status.created_at) > cutoff)
      .filter(directRepliesOnlyFor(account.data, statuses.data));

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

      const media = status.media_attachments
        .map((status) => status.url)

      return new Post(
        account.data.id,
        filteredText,
        new Date(status.created_at),
        status.in_reply_to_id ? status.in_reply_to_id : undefined,
        media,
      );
    });

    return Promise.all(posts);
  }
}